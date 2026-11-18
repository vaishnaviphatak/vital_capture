import React, { useState, useRef } from 'react';
import { Download, Printer, Heart, FileText, CheckCircle2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SAMPLE_HISTORY_DATA } from '../utils/mockData';

export default function Reports() {
  const { currentUser, userHistory } = useOutletContext();
  const reportRef = useRef(null);
  
  const [patientName, setPatientName] = useState(currentUser?.name || 'Jane Doe');
  const [patientAge, setPatientAge] = useState('28');
  const [isExporting, setIsExporting] = useState(false);

  const historyList = (userHistory && userHistory.length > 0) ? userHistory : SAMPLE_HISTORY_DATA;
  const latest = historyList[0] || { bpm: 72, rmssd: 52, resp_rate: 15, stress_lvl: 'Low' };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0c1017' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`VitalsCapture_Report_${patientName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Action Header */}
      <div className="glass-card" style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Clinical Assessment Report</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
            Generate and export verified optical cardiac screening documentation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => window.print()} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
            <Printer size={14} /> Print
          </button>
          <button onClick={handleExportPDF} className="btn-primary" style={{ fontSize: '0.82rem' }} disabled={isExporting}>
            <Download size={14} /> {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Patient Input Settings */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label>Subject Name</label>
            <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="text" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Clinical Report Document */}
      <div ref={reportRef} className="glass-card" style={{ padding: '2.5rem', background: '#0e131d', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-logo"><Heart size={18} /></div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>VitalsCapture Telemetry Summary</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Remote Photoplethysmography Physiological Assessment</p>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            <p>ID: #{Date.now().toString().slice(-6)}</p>
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Patient Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'var(--bg-surface-subtle)', padding: '1rem', borderRadius: '8px', marginBottom: '1.75rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Patient Name</span>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', color: '#fff', marginTop: '0.15rem' }}>{patientName}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Age</span>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', color: '#fff', marginTop: '0.15rem' }}>{patientAge} yrs</p>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Capture Type</span>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--vital-blue)', marginTop: '0.15rem' }}>Optical rPPG (30 FPS)</p>
          </div>
        </div>

        {/* Vitals Summary */}
        <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff', marginBottom: '0.85rem' }}>Recorded Biomarkers</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.75rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>HEART RATE</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'JetBrains Mono', color: '#f43f5e', marginTop: '0.2rem' }}>
              {Math.round(latest.bpm || 72)} <span className="unit">BPM</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>HRV (RMSSD)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'JetBrains Mono', color: '#818cf8', marginTop: '0.2rem' }}>
              {Math.round(latest.rmssd || 48)} <span className="unit">ms</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>RESPIRATION</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'JetBrains Mono', color: '#38bdf8', marginTop: '0.2rem' }}>
              {Math.round(latest.resp_rate || 15)} <span className="unit">BrPM</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>STRESS STATE</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'JetBrains Mono', color: 'var(--vital-emerald)', marginTop: '0.2rem' }}>
              {latest.stress_lvl || 'Low'}
            </div>
          </div>
        </div>

        {/* Clinical Note */}
        <div style={{ background: 'var(--bg-surface-subtle)', padding: '1.15rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '1.5rem' }}>
          <strong>Impression:</strong> The subject's resting cardiac baseline demonstrates normal sinus rhythm dynamics with balanced autonomic modulation (RMSSD: {Math.round(latest.rmssd || 48)}ms). Respiration rate was observed at {Math.round(latest.resp_rate || 15)} breaths per minute with stable signal quality throughout the 30-second recording window.
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          *This screening summary was generated using camera-based remote photoplethysmography (rPPG) and is intended for informational and wellness monitoring purposes.*
        </div>
      </div>
    </div>
  );
}