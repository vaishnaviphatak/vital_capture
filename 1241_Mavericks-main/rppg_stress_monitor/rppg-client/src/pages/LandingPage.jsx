import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Heart, Activity, ShieldCheck, ArrowRight, Video, 
  Wind, CheckCircle2, ChevronRight, BarChart3, LineChart
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { generateSyntheticWaveform } from '../utils/mockData';

export default function LandingPage() {
  const navigate = useNavigate();
  const [waveform, setWaveform] = useState([]);

  useEffect(() => {
    setWaveform(generateSyntheticWaveform(72, 60, 0.02));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', overflowY: 'auto' }}>
      {/* Top Navbar */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 3rem', borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(12, 16, 23, 0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand-logo">
            <Heart size={18} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '1.05rem', letterSpacing: '-0.2px' }}>
            VitalsCapture <span style={{ color: 'var(--vital-blue)' }}>rPPG</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Link to="/dashboard" className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            Open Dashboard
          </Link>
          <Link to="/live" className="btn-primary" style={{ fontSize: '0.85rem' }}>
            Start Monitoring <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem 6rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.35rem 0.85rem', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)', color: 'var(--vital-blue)',
            fontSize: '0.8rem', fontWeight: '600', marginBottom: '1.25rem'
          }}>
            <Activity size={14} /> Computer Vision Physiological Telemetry
          </div>

          <h1 style={{ fontSize: '3.2rem', fontWeight: '800', lineHeight: '1.15', letterSpacing: '-1px', marginBottom: '1.2rem', color: '#fff' }}>
            Contactless Cardiac & Stress Monitoring <br />
            Using Standard Camera Feeds
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto 2.2rem auto', lineHeight: '1.6' }}>
            Extract heart rate, heart rate variability (RMSSD), and respiratory rate through remote photoplethysmography (rPPG). No wearables or sensors required.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/live')} className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
              <Video size={18} /> Launch Live Camera Monitor
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              <BarChart3 size={18} /> View Analytics Hub
            </button>
          </div>
        </div>

        {/* Live Signal Preview Card */}
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#fff' }}>Optical Pulse Wave Extraction</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                Real-time plane-orthogonal-to-skin (POS) chrominance signal filtering
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-tertiary)' }}>RATE:</span> <strong style={{ color: 'var(--vital-red)' }}>72 BPM</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>HRV:</span> <strong style={{ color: 'var(--vital-violet)' }}>54 ms</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>RESP:</span> <strong style={{ color: 'var(--vital-blue)' }}>15 BrPM</strong></div>
            </div>
          </div>

          <div style={{ height: '140px', width: '100%', background: '#0a0e17', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waveform.map((val, idx) => ({ time: idx, val }))}>
                <defs>
                  <linearGradient id="landingWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35}/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={['auto', 'auto']} hide />
                <Area type="monotone" dataKey="val" stroke="#f43f5e" strokeWidth={2} fill="url(#landingWave)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div className="stat-icon heart" style={{ marginBottom: '1rem' }}>
              <Heart size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.4rem', color: '#fff' }}>Contactless Screening</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.55' }}>
              Tracks subtle green-channel hemoglobin light absorption changes on facial skin to compute pulse and autonomic rhythm.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div className="stat-icon resp" style={{ marginBottom: '1rem' }}>
              <Wind size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.4rem', color: '#fff' }}>Autonomic Stress Index</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.55' }}>
              Derives Root Mean Square of Successive Differences (RMSSD) to classify sympathetic vs. parasympathetic nervous system states.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div className="stat-icon hrv" style={{ marginBottom: '1rem' }}>
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.4rem', color: '#fff' }}>Local Privacy & Security</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.55' }}>
              All video frame processing and facial biometric matching occur locally on your machine with offline-ready SQLite database storage.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}