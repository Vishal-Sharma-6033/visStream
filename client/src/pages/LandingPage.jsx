import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api.service';

export default function LandingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [roomInput,  setRoomInput]  = useState('');
  const [roomName,   setRoomName]   = useState('');
  const [videoUrl,   setVideoUrl]   = useState('');
  const [creating,   setCreating]   = useState(false);
  const [joining,    setJoining]    = useState(false);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState('join'); // 'join' | 'create'

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setCreating(true); setError('');
    try {
      const { data } = await api.post('/api/rooms', {
        name: roomName || `${user.username}'s Room`,
        videoUrl: videoUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      });
      navigate(`/room/${data.room.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create room');
    } finally { setCreating(false); }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!roomInput.trim()) { setError('Enter a room code'); return; }
    navigate(`/room/${roomInput.trim().toUpperCase()}`);
  };

  return (
    <div style={pg}>
      {/* Hero background glow */}
      <div style={glow} />

      {/* Nav */}
      <nav style={nav}>
        <div style={logo}>🎬 <span style={logoText}>visStream</span></div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {user ? (
            <>
              <img src={user.avatar} alt={user.username} style={avatar} />
              <span style={{ color:'var(--c-text-muted)', fontSize:'0.88rem' }}>{user.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Sign In</button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={hero}>
        <div className="badge" style={{ marginBottom:24 }}>✨ Real-time sync • HLS streaming • Voice chat</div>
        <h1 style={heroTitle}>
          Watch Together,<br />
          <span style={accent}>Feel Together</span>
        </h1>
        <p style={heroSub}>
          Create a room, share the link, and watch videos in perfect sync with anyone in the world.
          Chat, react, and talk — all in one place.
        </p>

        {/* Room card */}
        <div className="glass animate-slide-up" style={card}>
          <div style={tabs}>
            {['join','create'].map(t => (
              <button key={t} style={{ ...tabBtn, ...(tab===t ? tabActive : {}) }} onClick={() => setTab(t)}>
                {t === 'join' ? '🔗 Join Room' : '✨ Create Room'}
              </button>
            ))}
          </div>

          {tab === 'join' ? (
            <form onSubmit={handleJoin} style={form}>
              <div className="form-group">
                <label>Room Code</label>
                <input
                  id="room-code-input"
                  className="input"
                  placeholder="e.g. AB12CD34"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{ letterSpacing:'0.15em', fontSize:'1.1rem', textAlign:'center' }}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button id="join-room-btn" className="btn btn-primary" type="submit" disabled={joining} style={{ width:'100%' }}>
                {joining ? 'Joining…' : '→ Join Room'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} style={form}>
              <div className="form-group">
                <label>Room Name</label>
                <input className="input" placeholder="Movie Night 🍿" value={roomName} onChange={e => setRoomName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>HLS Stream URL (optional)</label>
                <input className="input" placeholder="https://…/master.m3u8" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                <span style={{ fontSize:'0.75rem', color:'var(--c-text-dim)' }}>Leave blank to use our test stream</span>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button id="create-room-btn" className="btn btn-primary" type="submit" disabled={creating} style={{ width:'100%' }}>
                {creating ? 'Creating…' : '✨ Create Room'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Feature cards */}
      <section style={features}>
        {FEATURES.map(f => (
          <div key={f.title} className="glass" style={featureCard}>
            <span style={{ fontSize:'2rem' }}>{f.icon}</span>
            <h3 style={{ fontSize:'1rem', color:'var(--c-text)' }}>{f.title}</h3>
            <p style={{ fontSize:'0.82rem', lineHeight:1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer style={footer}>
        <p>Built with ❤️ using MERN + Socket.IO + HLS + WebRTC</p>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon:'🎬', title:'HLS Adaptive Streaming', desc:'Smooth 480p–1080p playback that adapts to your network speed automatically.' },
  { icon:'🔄', title:'Perfect Sync Engine',     desc:'Host controls playback; guests auto-correct drift every 4 seconds.' },
  { icon:'💬', title:'Live Chat & Reactions',   desc:'Message your friends with emoji reactions that float across the screen.' },
  { icon:'🔊', title:'Voice Chat',              desc:'Peer-to-peer WebRTC audio so you can talk while watching — no extra app needed.' },
];

// Inline styles (layout only; colours from CSS vars)
const pg      = { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' };
const glow    = { position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'80vw', height:'50vh', background:'var(--g-hero)', pointerEvents:'none', zIndex:0 };
const nav     = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', position:'relative', zIndex:10 };
const logo    = { display:'flex', alignItems:'center', gap:8, fontSize:'1.4rem' };
const logoText= { fontWeight:800, background:'var(--g-accent)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' };
const avatar  = { width:32, height:32, borderRadius:'50%', border:'2px solid var(--c-accent)' };
const hero    = { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px 40px', textAlign:'center', position:'relative', zIndex:1 };
const heroTitle= { fontSize:'clamp(2.8rem,7vw,5rem)', fontWeight:900, lineHeight:1.1, marginBottom:20 };
const accent  = { background:'var(--g-accent)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' };
const heroSub = { fontSize:'1.1rem', maxWidth:540, marginBottom:40, lineHeight:1.8 };
const card    = { width:'100%', maxWidth:480, padding:32 };
const tabs    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:24, background:'var(--c-surface2)', borderRadius:'var(--r-md)', padding:4 };
const tabBtn  = { padding:'10px 0', border:'none', borderRadius:'var(--r-sm)', background:'transparent', color:'var(--c-text-muted)', cursor:'pointer', fontSize:'0.88rem', fontWeight:600, fontFamily:'var(--font)', transition:'all 0.2s' };
const tabActive={ background:'var(--c-surface3)', color:'var(--c-text)', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' };
const form    = { display:'flex', flexDirection:'column', gap:16 };
const features= { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, padding:'0 40px 60px', maxWidth:1000, margin:'0 auto', width:'100%', position:'relative', zIndex:1 };
const featureCard={ padding:24, display:'flex', flexDirection:'column', gap:10 };
const footer  = { textAlign:'center', padding:'20px', color:'var(--c-text-dim)', fontSize:'0.8rem', borderTop:'1px solid var(--c-border)' };
