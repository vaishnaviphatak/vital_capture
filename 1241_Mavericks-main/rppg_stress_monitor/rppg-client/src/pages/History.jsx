import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Download, Trash2, Calendar, Activity } from 'lucide-react';
import { SAMPLE_HISTORY_DATA } from '../utils/mockData';

export default function History() {
  const { userHistory, setUserHistory } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStress, setFilterStress] = useState('ALL');

  const historyList = (userHistory && userHistory.length > 0) ? userHistory : SAMPLE_HISTORY_DATA;

  const exportCSV = () => {
    if (historyList.length === 0) return;
    const headers = ["Timestamp", "Heart Rate (BPM)", "HRV RMSSD (ms)", "Respiration Rate", "Stress Level", "Tag"];
    const rows = historyList.map(h => [
      `"${new Date(h.timestamp).toLocaleString()}"`,
      h.bpm ? Math.round(h.bpm) : '',
      h.rmssd ? Math.round(h.rmssd) : '',
      h.resp_rate ? Math.round(h.resp_rate) : '',
      h.stress_lvl || '',
      `"${h.tag || 'Baseline'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cardiac_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = historyList.filter(row => {
    const matchesSearch = searchTerm === '' || 
      (row.tag && row.tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      new Date(row.timestamp).toLocaleString().toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStress = filterStress === 'ALL' || row.stress_lvl === filterStress;
    return matchesSearch && matchesStress;
  });

  return (
    <div className="glass-card" style={{ padding: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Assessment Session History</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
            Past physiological monitoring records and verified vital logs.
          </p>
        </div>

        <button onClick={exportCSV} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1f2937', padding: '0.35rem 0.75rem', borderRadius: '7px', border: '1px solid var(--border-subtle)', width: '260px' }}>
          <Search size={14} color="var(--text-tertiary)" />
          <input 
            type="text" 
            placeholder="Search records..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.82rem' }}
          />
        </div>

        <div className="chip-container">
          {['ALL', 'Low', 'Moderate', 'High'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterStress(lvl)}
              className={`chip ${filterStress === lvl ? 'active' : ''}`}
            >
              {lvl === 'ALL' ? 'All' : `${lvl} Stress`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Heart Rate</th>
              <th>Respiration</th>
              <th>HRV (RMSSD)</th>
              <th>Stress Classification</th>
              <th>Session Tag</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id}>
                <td className="time-col">{new Date(row.timestamp).toLocaleString()}</td>
                <td className="val-col" style={{ color: '#f43f5e' }}>{row.bpm ? Math.round(row.bpm) : '--'} <span className="unit">BPM</span></td>
                <td className="val-col" style={{ color: '#38bdf8' }}>{row.resp_rate ? Math.round(row.resp_rate) : '--'} <span className="unit">BrPM</span></td>
                <td className="val-col" style={{ color: '#818cf8' }}>{row.rmssd ? Math.round(row.rmssd) : '--'} <span className="unit">ms</span></td>
                <td>
                  <span className={`status-badge ${row.stress_lvl === 'High' ? 'high' : row.stress_lvl === 'Low' ? 'low' : 'moderate'}`}>
                    {row.stress_lvl || 'Resting'}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {row.tag || 'Baseline'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}