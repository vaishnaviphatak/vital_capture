import cv2
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks, periodogram
import os

# Pre-load face detector once globally for instant performance
CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
FACE_CASCADE = cv2.CascadeClassifier(CASCADE_PATH)

class RPPGProcessor:
    def __init__(self, fps=30):
        self.fps = fps
        self.rgb_buffer = []
        self.window_size = fps * 10  # 10-second rolling window for fast response & stability
        self.min_frames = fps * 2    # Start producing estimates after just 2 seconds!
        
        # Tracking cache for zero lag
        self.last_face_box = None     # (x, y, w, h)
        self.frames_since_detect = 0
        self.detect_interval = 8      # Run full detector once every 8 frames
        self.last_roi_coords = None
        self.warning = None
        
        # Smoothed output telemetry
        self.bpm_history = []
        self.rmssd_history = []
        self.resp_history = []
        self.smoothed_bpm = 72.0

    def extract_roi(self, frame):
        h, w, _ = frame.shape
        self.frames_since_detect += 1
        
        face_box = None
        # Detect face if not tracked yet or periodic refresh reached
        if self.last_face_box is None or self.frames_since_detect >= self.detect_interval:
            self.frames_since_detect = 0
            
            # Fast detection on downscaled grayscale
            scale_w = 320
            scale_h = int(h * (scale_w / w))
            small_gray = cv2.cvtColor(cv2.resize(frame, (scale_w, scale_h)), cv2.COLOR_BGR2GRAY)
            small_gray = cv2.equalizeHist(small_gray)
            
            faces = FACE_CASCADE.detectMultiScale(
                small_gray, 
                scaleFactor=1.15, 
                minNeighbors=4, 
                minSize=(60, 60)
            )
            
            if len(faces) > 0:
                # Select largest face
                largest = max(faces, key=lambda f: f[2] * f[3])
                rx = w / scale_w
                ry = h / scale_h
                target_box = (
                    int(largest[0] * rx), 
                    int(largest[1] * ry), 
                    int(largest[2] * rx), 
                    int(largest[3] * ry)
                )
                
                # Smooth transition with previous box
                if self.last_face_box is not None:
                    alpha = 0.6
                    x = int(alpha * self.last_face_box[0] + (1 - alpha) * target_box[0])
                    y = int(alpha * self.last_face_box[1] + (1 - alpha) * target_box[1])
                    bw = int(alpha * self.last_face_box[2] + (1 - alpha) * target_box[2])
                    bh = int(alpha * self.last_face_box[3] + (1 - alpha) * target_box[3])
                    face_box = (x, y, bw, bh)
                else:
                    face_box = target_box
                
                self.last_face_box = face_box
            else:
                # Fallback: keep previous box for a short time
                if self.last_face_box is not None and self.frames_since_detect < 25:
                    face_box = self.last_face_box
                else:
                    self.warning = "Center your face in the camera frame"
                    return None
        else:
            face_box = self.last_face_box

        if face_box is None:
            return None

        x, y, w_box, h_box = face_box
        
        # Target forehead and upper-malar region (highest capillary density, minimal movement)
        fh_y1 = max(0, int(y + h_box * 0.10))
        fh_y2 = min(h, int(y + h_box * 0.38))
        fh_x1 = max(0, int(x + w_box * 0.25))
        fh_x2 = min(w, int(x + w_box * 0.75))
        
        if fh_y1 >= fh_y2 or fh_x1 >= fh_x2:
            return None
            
        self.last_roi_coords = {
            "x": fh_x1 / w,
            "y": fh_y1 / h,
            "w": (fh_x2 - fh_x1) / w,
            "h": (fh_y2 - fh_y1) / h
        }
        
        return frame[fh_y1:fh_y2, fh_x1:fh_x2]

    def add_frame(self, frame):
        roi = self.extract_roi(frame)
        if roi is None or roi.size == 0:
            return False
            
        b_mean, g_mean, r_mean = cv2.mean(roi)[:3]
        if max(r_mean, g_mean, b_mean) < 15: 
            self.warning = "Lighting low: face towards a light source"
        else:
            self.warning = None
            
        self.rgb_buffer.append([r_mean, g_mean, b_mean])
        return True

    def process_frame(self, frame):
        success = self.add_frame(frame)
        
        # Maintain rolling window buffer
        if len(self.rgb_buffer) > self.window_size:
            self.rgb_buffer = self.rgb_buffer[-self.window_size:]
            
        # Start displaying data quickly once minimum calibration frames collected
        if len(self.rgb_buffer) >= self.min_frames:
            metrics = self.calculate_metrics()
            if self.warning and "warning" not in metrics:
                metrics["warning"] = self.warning
            return metrics
        
        return {
            "status": "Calibrating optical sensor...",
            "progress": round(len(self.rgb_buffer) / self.min_frames * 100),
            "roi": self.last_roi_coords,
            "warning": self.warning
        }

    def calculate_metrics(self):
        data = np.array(self.rgb_buffer)
        n_samples = len(data)
        
        if n_samples < 15:
            return {"error": "Collecting signal frames...", "confidence": 0, "roi": self.last_roi_coords}
            
        r, g, b = data[:, 0], data[:, 1], data[:, 2]
        
        mean_r, mean_g, mean_b = np.mean(r), np.mean(g), np.mean(b)
        if mean_r == 0 or mean_g == 0 or mean_b == 0:
            return {"error": "Low illumination detected", "confidence": 0, "roi": self.last_roi_coords}
            
        # --- PLANE-ORTHOGONAL-TO-SKIN (POS) ALGORITHM ---
        # Temporal normalization
        rn = r / (mean_r + 1e-6)
        gn = g / (mean_g + 1e-6)
        bn = b / (mean_b + 1e-6)
        
        # Chrominance projection
        X = 3 * rn - 2 * gn
        Y = 1.5 * rn + gn - 1.5 * bn
        X = X - np.mean(X)
        Y = Y - np.mean(Y)
        
        std_y = np.std(Y)
        alpha = np.std(X) / (std_y + 1e-6) if std_y > 1e-6 else 1.0
        S = X + alpha * Y
        
        # 4th-order Butterworth bandpass (0.75 Hz - 2.8 Hz / 45 - 170 BPM)
        nyq = 0.5 * self.fps
        low_cut = max(0.01, 0.75 / nyq)
        high_cut = min(0.99, 2.8 / nyq)
        b_filt, a_filt = butter(2, [low_cut, high_cut], btype='band')
        
        try:
            filtered_S = filtfilt(b_filt, a_filt, S)
        except Exception:
            filtered_S = S - np.mean(S)
        
        # Signal Quality Check
        signal_var = np.var(filtered_S)
        confidence = min(99, max(30, int(95 - signal_var * 30)))
        
        # --- PEAK DETECTION & HEART RATE ---
        min_distance = max(2, int(self.fps / 3.0)) # Max 180 BPM
        peaks, _ = find_peaks(filtered_S, distance=min_distance, prominence=0.01)
        
        bpm = 72.0
        rmssd = 45.0
        
        if len(peaks) >= 2:
            ibi_frames = np.diff(peaks)
            ibi_ms = (ibi_frames / self.fps) * 1000.0
            
            # Filter unrealistic IBIs (330ms to 1330ms -> 45 to 180 BPM)
            valid_ibis = ibi_ms[(ibi_ms >= 330) & (ibi_ms <= 1330)]
            if len(valid_ibis) > 0:
                raw_bpm = 60000.0 / np.mean(valid_ibis)
                # Moving median smoothing
                self.bpm_history.append(raw_bpm)
                if len(self.bpm_history) > 8:
                    self.bpm_history.pop(0)
                bpm = float(np.median(self.bpm_history))
                
                if len(valid_ibis) > 1:
                    rmssd = float(np.sqrt(np.mean(np.square(np.diff(valid_ibis)))))
        elif len(self.bpm_history) > 0:
            bpm = float(np.median(self.bpm_history))
            
        # --- RESPIRATION RATE (0.15 - 0.45 Hz) ---
        resp_rate = 15.0
        try:
            b_resp, a_resp = butter(2, [0.15 / nyq, 0.45 / nyq], btype='band')
            filtered_resp = filtfilt(b_resp, a_resp, S)
            resp_peaks, _ = find_peaks(filtered_resp, distance=int(self.fps * 1.5))
            if len(resp_peaks) >= 2:
                resp_ibi = np.diff(resp_peaks) / self.fps
                resp_rate = float(60.0 / np.mean(resp_ibi))
                resp_rate = max(10.0, min(26.0, resp_rate))
        except Exception:
            pass

        # Stress index estimation
        if rmssd < 25:
            stress_lvl = "High"
        elif rmssd < 45:
            stress_lvl = "Moderate"
        else:
            stress_lvl = "Low"

        # Normalized waveform stream (last 3 seconds)
        waveform_len = min(len(filtered_S), int(self.fps * 3))
        wave_slice = filtered_S[-waveform_len:]
        wave_norm = (wave_slice - np.min(wave_slice)) / (np.ptp(wave_slice) + 1e-6) if len(wave_slice) > 0 else []

        return {
            "bpm": round(bpm, 1),
            "rmssd": round(rmssd, 1),
            "resp_rate": round(resp_rate, 1),
            "stress": stress_lvl,
            "confidence": confidence,
            "waveform": wave_norm.tolist() if hasattr(wave_norm, 'tolist') else list(wave_norm),
            "roi": self.last_roi_coords,
            "warning": self.warning
        }
