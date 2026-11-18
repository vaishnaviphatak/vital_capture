import React, { useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Activity, History as HistoryIcon, FileText, 
  Search, Heart, User, UserPlus, LogOut, Video, HelpCircle
} from 'lucide-react';
import Webcam from 'react-webcam';

export default function MainLayout() {
  const location = useLocation();
  
  // Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [userHistory, setUserHistory] = useState(() => {
    const saved = localStorage.getItem('userHistory');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [authMode, setAuthMode] = useState(null); // 'login' | 'register'
  const [regName, setRegName] = useState('');
  const [authMsg, setAuthMsg] = useState({ type: '', text: '' });
  const webcamRef = useRef(null);

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  const HTTP_URL = port === '8000' ? '' : `${protocol}//${hostname}:8000`;

  const handleAuth = async () => {
    if (!webcamRef.current) return setAuthMsg({ type: 'error', text: 'Camera access is required.' });
    const frame = webcamRef.current.getScreenshot();
    if (!frame) return setAuthMsg({ type: 'error', text: 'Failed to capture frame. Ensure camera is enabled.' });

    setAuthMsg({ type: 'info', text: 'Matching facial biometrics...' });

    try {
      if (authMode === 'register') {
        const res = await fetch(`${HTTP_URL}/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: regName, image_b64: frame })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAuthMsg({ type: 'success', text: 'Profile created. You can now log in.' });
        setTimeout(() => setAuthMode('login'), 1500);
      } else {
        const res = await fetch(`${HTTP_URL}/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_b64: frame })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAuthMsg({ type: 'success', text: `Welcome back, ${data.name}.` });
        setTimeout(() => {
          setCurrentUser({ id: data.user_id, name: data.name });
          setUserHistory(data.history || []);
          localStorage.setItem('currentUser', JSON.stringify({ id: data.user_id, name: data.name }));
          localStorage.setItem('userHistory', JSON.stringify(data.history || []));
          setAuthMode(null);
          setAuthMsg({ type: '', text: '' });
        }, 1000);
      }
    } catch (err) {
      setAuthMsg({ type: 'error', text: err.message || 'Authentication failed.' });
    }
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/" className="brand">
          <div className="brand-logo">
            <Heart size={18} />
          </div>
          <div className="brand-text">
            <h2>VitalsCapture</h2>
            <p>rPPG Monitoring</p>
          </div>
        </Link>

        <nav className="nav-menu">
          <p className="nav-label">Monitoring</p>
          <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </Link>
          <Link to="/live" className={`nav-item ${location.pathname === '/live' ? 'active' : ''}`}>
            <Activity size={17} />
            <span>Live Monitor</span>
          </Link>
          <Link to="/history" className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`}>
            <HistoryIcon size={17} />
            <span>Session History</span>
          </Link>
          
          <p className="nav-label" style={{ marginTop: '1.2rem' }}>Analysis & Export</p>
          <Link to="/reports" className={`nav-item ${location.pathname === '/reports' ? 'active' : ''}`}>
            <FileText size={17} />
            <span>Clinical Reports</span>
          </Link>
          <Link to="/insights" className={`nav-item ${location.pathname === '/insights' ? 'active' : ''}`}>
            <HelpCircle size={17} />
            <span>How it Works</span>
          </Link>
        </nav>

        {/* Sidebar User Profile */}
        <div className="sidebar-footer">
          {currentUser ? (
            <div className="user-profile">
              <div className="avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <h4>{currentUser.name}</h4>
                <p>Authenticated</p>
              </div>
              <button onClick={() => { 
                setCurrentUser(null); 
                localStorage.removeItem('currentUser');
              }} className="logout-btn" title="Log out">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <button onClick={() => { setAuthMode('login'); setAuthMsg({type:'',text:''}); }} className="btn-primary" style={{ width: '100%', fontSize: '0.82rem' }}>
                <User size={14} /> Face Login
              </button>
              <button onClick={() => { setAuthMode('register'); setAuthMsg({type:'',text:''}); }} className="btn-secondary" style={{ width: '100%', fontSize: '0.82rem' }}>
                <UserPlus size={14} /> Register Profile
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header className="top-header">
          <div className="header-search">
            <Search size={15} className="search-icon" />
            <input type="text" placeholder="Search sessions, tags, dates..." className="search-input" />
          </div>

          <div className="header-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--vital-emerald)', fontWeight: '600' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--vital-emerald)' }} />
              <span>Supabase Cloud Connected</span>
            </div>

            <Link to="/live" className="btn-record">
              <Video size={14} /> Record Session
            </Link>
          </div>
        </header>

        <div id="dashboard-content" className="dashboard-scroll">
          <Outlet context={{ currentUser, userHistory, setUserHistory }} />
        </div>
      </main>

      {/* Auth Modal */}
      {authMode && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-header">
              <h2>{authMode === 'register' ? 'Register Face Profile' : 'Face Authentication'}</h2>
              <button onClick={() => setAuthMode(null)} className="btn-close">&times;</button>
            </div>
            
            {authMsg.text && (
              <div className={`alert ${authMsg.type}`}>
                {authMsg.text}
              </div>
            )}

            <div style={{ height: '190px', borderRadius: '8px', overflow: 'hidden', background: '#000', position: 'relative' }}>
              <Webcam 
                ref={webcamRef} 
                screenshotFormat="image/jpeg" 
                screenshotQuality={0.7}
                videoConstraints={{ facingMode: "user" }}
                className="webcam-view" 
                mirrored={true} 
              />
            </div>

            {authMode === 'register' && (
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={regName} 
                  onChange={e => setRegName(e.target.value)} 
                  placeholder="e.g. Jane Doe" 
                />
              </div>
            )}

            <button onClick={handleAuth} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              {authMode === 'register' ? 'Save Profile' : 'Authenticate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}