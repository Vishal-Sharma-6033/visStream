import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useRoom }   from '../../context/RoomContext';
import HostVideoUploadPanel from './HostVideoUploadPanel';

export default function RoomHeader({ roomId, roomName, isHost }) {
  const navigate = useNavigate();
  const { emit } = useSocket();
  const { members } = useRoom();

  const [copied,   setCopied]   = useState(false);
  const [showUrl,  setShowUrl]  = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeave = () => {
    emit('room:leave');
    navigate('/');
  };

  const handleChangeVideo = (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    emit('video:change', { videoUrl: videoUrl.trim() });
    setVideoUrl('');
    setShowUrl(false);
  };

  const handleApplyUploadedVideo = ({ videoUrl: nextUrl, videoId }) => {
    if (!nextUrl) return;
    emit('video:change', { videoUrl: nextUrl, videoId });
    setShowUpload(false);
  };

  return (
    <header style={bar}>
      {/* Left — logo + room info */}
      <div style={left}>
        <div style={logoWrap}>🎬</div>
        <div>
          <div style={roomNameStyle}>{roomName || roomId}</div>
          <div style={meta}>
            <span className="badge" style={{ fontSize:'0.68rem', padding:'2px 8px' }}>Room: {roomId}</span>
            <span style={{ fontSize:'0.74rem', color:'var(--c-text-muted)' }}>{members.length} connected</span>
            {isHost && <span style={hostPill}>Host Session</span>}
          </div>
        </div>
      </div>

      {/* Right — actions */}
      <div style={actions}>
        {isHost && (
          <div style={{ position:'relative', display:'flex', gap:8 }}>
            <button id="change-video-btn" className="btn btn-ghost btn-sm" onClick={() => { setShowUrl(s => !s); setShowUpload(false); }}>
              Change Video URL
            </button>
            <button id="upload-video-btn" className="btn btn-primary btn-sm" onClick={() => { setShowUpload(s => !s); setShowUrl(false); }}>
              Upload Video
            </button>

            {showUrl && (
              <form onSubmit={handleChangeVideo} style={dropdown}>
                <input
                  className="input"
                  placeholder="HLS URL (.../master.m3u8)"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  style={{ fontSize:'0.82rem' }}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" type="submit">Load</button>
              </form>
            )}

            <HostVideoUploadPanel
              open={showUpload}
              onClose={() => setShowUpload(false)}
              onApplyVideo={handleApplyUploadedVideo}
            />
          </div>
        )}

        <button id="copy-link-btn" className="btn btn-ghost btn-sm" onClick={copyLink}>
          {copied ? '✅ Copied!' : '🔗 Invite'}
        </button>
        <button id="leave-room-btn" className="btn btn-danger btn-sm" onClick={handleLeave}>Leave</button>
      </div>
    </header>
  );
}

const bar       = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface)', flexShrink:0, zIndex:10 };
const left      = { display:'flex', alignItems:'center', gap:12 };
const roomNameStyle = { fontWeight:700, fontSize:'1rem', color:'var(--c-text)', letterSpacing:'0.01em' };
const meta      = { display:'flex', alignItems:'center', gap:8, marginTop:3 };
const actions   = { display:'flex', gap:8, alignItems:'center', position:'relative' };
const dropdown  = { position:'absolute', top:'110%', right:0, background:'var(--c-surface2)', border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', padding:12, display:'flex', gap:8, minWidth:360, boxShadow:'var(--shadow-lg)', zIndex:100 };
const logoWrap  = {
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 10,
  background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(59,130,246,0.16))',
  border: '1px solid var(--c-border)',
  fontSize: '1.05rem',
};
const hostPill  = {
  fontSize: '0.7rem',
  color: 'var(--c-amber)',
  background: 'rgba(245,158,11,0.12)',
  border: '1px solid rgba(245,158,11,0.35)',
  borderRadius: 999,
  padding: '2px 8px',
  fontWeight: 600,
};
