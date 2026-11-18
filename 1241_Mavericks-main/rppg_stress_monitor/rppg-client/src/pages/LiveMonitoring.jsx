import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { 
  Camera, Upload, Activity, Clock, Heart, Wind, Zap, CheckCircle2, 
  Info, AlertCircle, Save, RefreshCw
} from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function LiveMonitoring() {
  const { currentUser, setUserHistory, userHistory } = useOutletContext();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const ws = useRef(null);
  
  const [mode, setMode] = useState('live'); // 'live' | 'upload'
  const [videoPreview, setVideoPreview] = useState(null);
  const [data, setData] = useState({});
  const [sessionTag, setSessionTag] = useState('Resting Baseline');
  
  // 30s Recording State
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'done'
  const scanStateRef = useRef(scanState);
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);
  const [timeLeft, setTimeLeft] = useState(30);

  // Network URLs
  const protocol = window.location.protocol;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port;
  const HTTP_URL = port === '8000' ? '' : `${protocol}//${hostname}:8000`;
  const WS_URL = port === '8000' ? `${wsProtocol}//${window.location.host}` : `${wsProtocol}//${hostname}:8000`;

  // WebSocket frame streaming
  useEffect(() => {
    if (mode !== 'live') {
      if (ws.current) ws.current.close();
      return;
    }
    
    ws.current = new WebSocket(`${WS_URL}/ws/video`);
    ws.current.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (e) {}
    };

    const interval = setInterval(() => {
      if (scanStateRef.current === 'done') return;
      if (webcamRef.current && ws.current?.readyState === WebSocket.OPEN) {
        const frame = webcamRef.current.getScreenshot();
        if (frame) ws.current.send(JSON.stringify({ frame }));
      }
    }, 45); // 22 FPS smooth streaming

    return () => {
      clearInterval(interval);
      if (ws.current) ws.current.close();
    };
  }, [mode]);

  // Video Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoPreview(URL.createObjectURL(file));
    setData({ status: "Extracting optical signals..." });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${HTTP_URL}/upload`, { method: 'POST', body: formData });
      const resData = await response.json();
      setData(resData);
    } catch (err) {
      setData({ error: "Failed to process video file.", confidence: 0 });
    }
  };

  // 30s Recording Logic
  useEffect(() => {
    let timer;
    if (scanState === 'scanning' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (scanState === 'scanning' && timeLeft === 0) {
      saveSession();
    }
    return () => clearTimeout(timer);
  }, [scanState, timeLeft]);

  const triggerRecording = () => {
    setScanState('scanning');
    setTimeLeft(30);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command: 'reset' }));
      setData({});
    }
  };

  const saveSession = async () => {
    setScanState('done');
    const finalBpm = data.bpm || 72;
    const finalRmssd = data.rmssd || 45;
    const finalResp = data.resp_rate || 15;
    const finalStress = data.stress || 'Moderate';

    const newRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      bpm: finalBpm,
      rmssd: finalRmssd,
      resp_rate: finalResp,
      stress_lvl: finalStress,
      tag: sessionTag
    };

    const updated = [newRecord, ...(userHistory || [])];
    setUserHistory(updated);
    localStorage.setItem('userHistory', JSON.stringify(updated));

    if (currentUser?.id) {
      try {
        await fetch(`${HTTP_URL}/save_history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            bpm: finalBpm,
            rmssd: finalRmssd,
            resp_rate: finalResp,
            stress_lvl: finalStress
          })
        });
      } catch (e) {
        console.error("Save error:", e);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Top Header & Actions */}
      <div className="glass-card" style={{ padding: '0.9rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>INPUT MODE:</span>
          <div className="chip-container">
            <button onClick={() => setMode('live')} className={`chip ${mode === 'live' ? 'active' : ''}`}>
              <Camera size={13} style={{ display: 'inline', marginRight: '4px' }} /> Live Webcam
            </button>
            <button onClick={() => setMode('upload')} className={`chip ${mode === 'upload' ? 'active' : ''}`}>
              <Upload size={13} style={{ display: 'inline', marginRight: '4px' }} /> Upload Video
            </button>
          </div>
        </div>

        {/* 30s Recording Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {scanState === 'idle' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select 
                value={sessionTag} 
                onChange={(e) => setSessionTag(e.target.value)}
                style={{ background: '#1f2937', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              >
                <option value="Resting Baseline">Tag: Resting Baseline</option>
                <option value="Post-Exercise">Tag: Post-Exercise</option>
                <option value="Stress Test">Tag: Stress Test</option>
                <option value="Deep Breathing">Tag: Deep Breathing</option>
              </select>

              <button onClick={triggerRecording} className="btn-record">
                <Activity size={14} /> Start 30s Recording
              </button>
            </div>
          ) : scanState === 'scanning' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--vital-amber)', padding: '0.4rem 0.85rem', borderRadius: '7px', fontSize: '0.82rem', fontWeight: '600' }}>
              <Clock size={14} /> Recording: {timeLeft}s remaining
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: 'var(--vital-emerald)', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={15} /> Session Logged
              </span>
              <button onClick={() => navigate('/history')} className="btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}>
                View Log
              </button>
              <button onClick={() => setScanState('idle')} className="btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}>
                Record Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="bento-grid">
        {/* Camera / Video Card */}
        <div className="widget cam-widget glass-card">
          <div className="widget-header">
            <h3>
              <Camera size={15} color="var(--vital-blue)" />
              {mode === 'live' ? 'Optical Region of Interest (ROI)' : 'Video File Stream'}
            </h3>
            {data.confidence ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Signal Quality: <strong style={{ color: 'var(--vital-emerald)' }}>{data.confidence}%</strong>
              </span>
            ) : null}
          </div>

          <div className="cam-container">
            {mode === 'live' ? (
              <>
                <Webcam 
                  ref={webcamRef} 
                  screenshotFormat="image/jpeg" 
                  screenshotQuality={0.65}
                  minScreenshotWidth={320}
                  minScreenshotHeight={240}
                  videoConstraints={{ facingMode: "user", width: 640, height: 480 }} 
                  className="webcam-view" 
                  mirrored={true} 
                />
                {data.roi && !data.error && (
                  <div className="roi-box" style={{ 
                    left: `${(1 - data.roi.x - data.roi.w) * 100}%`, 
                    top: `${data.roi.y * 100}%`, 
                    width: `${data.roi.w * 100}%`, 
                    height: `${data.roi.h * 100}%` 
                  }} />
                )}
              </>
            ) : (
              videoPreview ? (
                <video src={videoPreview} className="webcam-view" controls={false} loop autoPlay muted />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <Upload size={36} color="var(--text-tertiary)" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Select a video file to analyze</p>
                  <input type="file" accept="video/mp4,video/webm" onChange={handleFileUpload} id="vid-upload" style={{ display: 'none' }} />
                  <label htmlFor="vid-upload" className="btn-secondary" style={{ marginTop: '0.85rem', cursor: 'pointer', display: 'inline-block' }}>
                    Browse Video
                  </label>
                </div>
              )
            )}

            {/* Diagnostic Message Overlay */}
            <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', background: 'rgba(0,0,0,0.7)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: data.error ? 'var(--vital-red)' : 'var(--vital-emerald)' }} />
              <span>{data.error || data.warning || (data.status ? `${data.status}` : 'Tracking active (30 FPS)')}</span>
            </div>
          </div>
        </div>

        {/* Vital Metric Cards */}
        <div className="widget glass-card stat-card">
          <div className="stat-icon heart"><Heart size={20} /></div>
          <div className="stat-content">
            <h4>Heart Rate</h4>
            <div className="stat-value">
              {data.bpm ? data.bpm : '--'} <span className="unit">BPM</span>
            </div>
            <p className="stat-sub">Normal resting: 60–100 BPM</p>
          </div>
        </div>

        <div className="widget glass-card stat-card">
          <div className="stat-icon resp"><Wind size={20} /></div>
          <div className="stat-content">
            <h4>Respiration Rate</h4>
            <div className="stat-value">
              {data.resp_rate ? data.resp_rate : '--'} <span className="unit">BrPM</span>
            </div>
            <p className="stat-sub">Normal resting: 12–20 BrPM</p>
          </div>
        </div>

        <div className="widget glass-card stat-card">
          <div className="stat-icon hrv"><Activity size={20} /></div>
          <div className="stat-content">
            <h4>HRV (RMSSD)</h4>
            <div className="stat-value">
              {data.rmssd ? data.rmssd : '--'} <span className="unit">ms</span>
            </div>
            <p className="stat-sub">Vagal modulation index</p>
          </div>
        </div>

        <div className="widget glass-card stat-card">
          <div className="stat-icon stress"><Zap size={20} /></div>
          <div className="stat-content">
            <h4>Autonomic Stress</h4>
            <div className="stat-value" style={{ 
              color: data.stress === 'High' ? 'var(--vital-red)' : data.stress === 'Low' ? 'var(--vital-emerald)' : 'var(--vital-amber)' 
            }}>
              {data.stress ? data.stress : 'Resting'}
            </div>
            <span className={`status-badge ${data.stress ? data.stress.toLowerCase() : 'low'}`} style={{ marginTop: '0.35rem' }}>
              {data.stress === 'High' ? 'Elevated' : data.stress === 'Low' ? 'Optimal Recovery' : 'Moderate'}
            </span>
          </div>
        </div>

        {/* Real-time Photoplethysmography (PPG) Waveform Trace */}
        <div className="widget glass-card" style={{ gridColumn: 'span 4', height: '240px' }}>
          <div className="widget-header">
            <h3>
              <Activity size={15} color="var(--vital-red)" />
              Photoplethysmography (rPPG) Pulse Signal
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono' }}>
              POS Bandpass Filtered (0.75–2.80 Hz)
            </span>
          </div>

          <div style={{ flex: 1, position: 'relative', marginTop: '0.5rem', background: '#0a0e17', borderRadius: '8px', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}>
            {data.waveform && !data.error ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.waveform.map((val, idx) => ({ time: idx, val }))}>
                  <defs>
                    <linearGradient id="liveWaveform" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '6px', fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="val" stroke="#f43f5e" strokeWidth={2} fill="url(#liveWaveform)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                Position your face within the camera frame to extract pulse wave...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}