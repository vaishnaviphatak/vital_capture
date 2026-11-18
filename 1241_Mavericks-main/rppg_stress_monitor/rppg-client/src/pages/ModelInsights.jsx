import React from 'react';
import { HelpCircle, Layers, Activity, Wind, Heart, Shield } from 'lucide-react';

export default function ModelInsights() {
  const steps = [
    {
      num: "01",
      title: "Video Capture & Facial Detection",
      desc: "Standard webcam frames (30 FPS) are captured. A facial region of interest (ROI) is located across the forehead and cheek zones where capillary density is highest and muscular motion is minimal."
    },
    {
      num: "02",
      title: "Green Channel Extraction",
      desc: "Oxygenated hemoglobin absorbs green light (~530nm) significantly more than red or blue light. Frame-by-frame mean intensity variations in this band capture micro-pulsations caused by blood volume changes."
    },
    {
      num: "03",
      title: "POS Chrominance Projection",
      desc: "The Plane-Orthogonal-to-Skin (POS) algorithm projects the RGB color signals onto a plane orthogonal to the skin reflection vector, eliminating specular reflection and ambient lighting flicker."
    },
    {
      num: "04",
      title: "Butterworth Bandpass Filtering",
      desc: "A zero-phase 4th-order Butterworth bandpass filter (0.75 Hz to 2.80 Hz / 45 to 170 BPM) removes low-frequency baseline drift and high-frequency optical sensor noise."
    },
    {
      num: "05",
      title: "Peak Detection & HRV Calculation",
      desc: "Systolic peaks in the photoplethysmogram wave are detected to compute Inter-Beat Intervals (IBIs), Heart Rate (BPM), and Root Mean Square of Successive Differences (RMSSD) for stress estimation."
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '1.75rem 2rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#fff', marginBottom: '0.35rem' }}>
          How rPPG Signal Processing Works
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.55' }}>
          Remote photoplethysmography (rPPG) is an optical computer vision technique that detects micro-color changes in human skin corresponding to the cardiac pulse cycle.
        </p>
      </div>

      {/* 5-Step Pipeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {steps.map((s, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '1.25rem 1.75rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--vital-blue)', fontFamily: 'JetBrains Mono' }}>
              {s.num}
            </span>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>{s.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}