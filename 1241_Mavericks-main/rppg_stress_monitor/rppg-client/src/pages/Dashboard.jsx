import React, { useState } from 'react';
import { 
  Heart, Activity, Wind, Zap, TrendingUp, Calendar, 
  Video, ArrowRight, CheckCircle2, Clock
} from 'lucide-react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { SAMPLE_HISTORY_DATA } from '../utils/mockData';

export default function Dashboard() {
  const { userHistory, setUserHistory, currentUser } = useOutletContext();
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState('bpm'); // 'bpm' | 'rmssd' | 'resp'

  const historyList = (userHistory && userHistory.length > 0) ? userHistory : SAMPLE_HISTORY_DATA;

  // Averages
  const avgBpm = Math.round(historyList.reduce((acc, h) => acc + (h.bpm || 72), 0) / historyList.length);
  const avgHrv = Math.round(historyList.reduce((acc, h) => acc + (h.rmssd || 45), 0) / historyList.length);
  const avgResp = Math.round(historyList.reduce((acc, h) => acc + (h.resp_rate || 15), 0) / historyList.length);

  const chartData = [...historyList].reverse().map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bpm: Math.round(h.bpm || 70),
    rmssd: Math.round(h.rmssd || 40),
    resp: Math.round(h.resp_rate || 15),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div className="glass-card" style={{ padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' }}>
            {currentUser ? `Patient Overview: ${currentUser.name}` : 'Physiological Telemetry Overview'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Contactless facial optical screening summary and recent baseline trends.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/live')} className="btn-record">
            <Video size={15} /> Record 30s Session
          </button>
        </div>
      </div>

      {/* 4 Key Vital Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem' }}>
        <div 
          className="glass-card stat-card" 
          onClick={() => setActiveMetric('bpm')}
          style={{ cursor: 'pointer', border: activeMetric === 'bpm' ? '1px solid var(--vital-red)' : '' }}
        >
          <div className="stat-icon heart"><Heart size={20} /></div>
          <div className="stat-content">
            <h4>Avg Heart Rate</h4>
            <div className="stat-value">{avgBpm} <span className="unit">BPM</span></div>
            <p className="stat-sub">Normal: 60–100 BPM</p>
          </div>
        </div>

        <div 
          className="glass-card stat-card" 
          onClick={() => setActiveMetric('rmssd')}
          style={{ cursor: 'pointer', border: activeMetric === 'rmssd' ? '1px solid var(--vital-violet)' : '' }}
        >
          <div className="stat-icon hrv"><Activity size={20} /></div>
          <div className="stat-content">
            <h4>Avg HRV (RMSSD)</h4>
            <div className="stat-value">{avgHrv} <span className="unit">ms</span></div>
            <p className="stat-sub">Higher reflects recovery</p>
          </div>
        </div>

        <div 
          className="glass-card stat-card" 
          onClick={() => setActiveMetric('resp')}
          style={{ cursor: 'pointer', border: activeMetric === 'resp' ? '1px solid var(--vital-blue)' : '' }}
        >
          <div className="stat-icon resp"><Wind size={20} /></div>
          <div className="stat-content">
            <h4>Avg Respiration</h4>
            <div className="stat-value">{avgResp} <span className="unit">BrPM</span></div>
            <p className="stat-sub">Normal: 12–20 BrPM</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon stress"><Zap size={20} /></div>
          <div className="stat-content">
            <h4>Autonomic State</h4>
            <div className="stat-value" style={{ color: 'var(--vital-emerald)' }}>Optimal</div>
            <p className="stat-sub">Resting parasympathetic</p>
          </div>
        </div>
      </div>

      {/* Main Longitudinal Trend Chart */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>Physiological Session History</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Historical recordings across monitoring windows
            </p>
          </div>

          <div className="chip-container">
            <button onClick={() => setActiveMetric('bpm')} className={`chip ${activeMetric === 'bpm' ? 'active' : ''}`}>
              Heart Rate
            </button>
            <button onClick={() => setActiveMetric('rmssd')} className={`chip ${activeMetric === 'rmssd' ? 'active' : ''}`}>
              HRV (RMSSD)
            </button>
            <button onClick={() => setActiveMetric('resp')} className={`chip ${activeMetric === 'resp' ? 'active' : ''}`}>
              Respiration
            </button>
          </div>
        </div>

        <div style={{ height: '280px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="0%" 
                    stopColor={activeMetric === 'bpm' ? '#f43f5e' : activeMetric === 'rmssd' ? '#818cf8' : '#38bdf8'} 
                    stopOpacity={0.25}
                  />
                  <stop 
                    offset="100%" 
                    stopColor={activeMetric === 'bpm' ? '#f43f5e' : activeMetric === 'rmssd' ? '#818cf8' : '#38bdf8'} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
              <YAxis stroke="var(--text-tertiary)" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '6px' }} />
              <Area 
                type="monotone" 
                dataKey={activeMetric} 
                stroke={activeMetric === 'bpm' ? '#f43f5e' : activeMetric === 'rmssd' ? '#818cf8' : '#38bdf8'} 
                strokeWidth={2} 
                fill="url(#metricGrad)" 
                name={activeMetric === 'bpm' ? 'Heart Rate (BPM)' : activeMetric === 'rmssd' ? 'HRV (RMSSD)' : 'Respiration (BrPM)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}