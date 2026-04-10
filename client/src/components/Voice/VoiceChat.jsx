import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth }   from '../../context/AuthContext';
import webrtcService from '../../services/webrtc.service';

export default function VoiceChat({ roomId }) {
  const { socket, on, off, emit } = useSocket();
  const { user } = useAuth();

  const [active,  setActive]  = useState(false);
  const [muted,   setMuted]   = useState(false);
  const [peers,   setPeers]   = useState([]); // { socketId, username, stream, isMuted }
  const audioRefs = useRef({});

  // Attach remote audio stream to audio element
  const handleRemoteTrack = useCallback((socketId, stream) => {
    setPeers(p => {
      const exists = p.find(x => x.socketId === socketId);
      if (exists) return p.map(x => x.socketId === socketId ? { ...x, stream } : x);
      return [...p, { socketId, stream, username: socketId, isMuted: false }];
    });
  }, []);

  const joinVoice = useCallback(async () => {
    webrtcService.init(socket.current, handleRemoteTrack);
    await webrtcService.getLocalStream();
    setActive(true);
  }, [socket, handleRemoteTrack]);

  const leaveVoice = useCallback(() => {
    webrtcService.destroy();
    setActive(false);
    setPeers([]);
  }, []);

  const toggleMute = useCallback(() => {
    const nowMuted = webrtcService.toggleMute();
    setMuted(nowMuted);
    emit('voice:mute', { isMuted: nowMuted });
  }, [emit]);

  // Handle WebRTC signaling events
  useEffect(() => {
    if (!active) return;

    const onOffer    = async ({ fromSocketId, offer })   => { await webrtcService.handleOffer(fromSocketId, offer); };
    const onAnswer   = async ({ fromSocketId, answer })  => { await webrtcService.handleAnswer(fromSocketId, answer); };
    const onIce      = async ({ fromSocketId, candidate })=> { await webrtcService.handleIceCandidate(fromSocketId, candidate); };
    const onUserJoin = async ({ socketId }) => { if (socketId !== socket.current?.id) await webrtcService.initiateCall(socketId); };
    const onUserLeave= ({ socketId }) => { webrtcService.disconnectPeer(socketId); setPeers(p => p.filter(x => x.socketId !== socketId)); };
    const onVoiceMute= ({ socketId, isMuted }) => { setPeers(p => p.map(x => x.socketId === socketId ? { ...x, isMuted } : x)); };

    on('webrtc:offer',        onOffer);
    on('webrtc:answer',       onAnswer);
    on('webrtc:ice-candidate',onIce);
    on('room:user-joined',    onUserJoin);
    on('room:user-left',      onUserLeave);
    on('voice:mute',          onVoiceMute);

    return () => {
      off('webrtc:offer',        onOffer);
      off('webrtc:answer',       onAnswer);
      off('webrtc:ice-candidate',onIce);
      off('room:user-joined',    onUserJoin);
      off('room:user-left',      onUserLeave);
      off('voice:mute',          onVoiceMute);
    };
  }, [active, on, off, socket]);

  // Attach streams to audio elements
  useEffect(() => {
    peers.forEach(({ socketId, stream }) => {
      if (audioRefs.current[socketId] && stream) {
        audioRefs.current[socketId].srcObject = stream;
      }
    });
  }, [peers]);

  return (
    <div style={panel}>
      <div style={header}>
        <span style={{ fontWeight:700, fontSize:'0.88rem' }}>🔊 Voice</span>
        <div style={{ display:'flex', gap:6 }}>
          {active && (
            <button id="voice-mute-btn" className={`btn-icon btn-sm ${muted ? 'active' : ''}`} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🎤' : '🎙️'}
            </button>
          )}
          <button
            id={active ? 'voice-leave-btn' : 'voice-join-btn'}
            className={`btn btn-sm ${active ? 'btn-danger' : 'btn-ghost'}`}
            onClick={active ? leaveVoice : joinVoice}
          >
            {active ? 'Leave' : 'Join Voice'}
          </button>
        </div>
      </div>

      {active && (
        <div style={peerList}>
          {/* Self */}
          <div style={peerItem}>
            <div style={{ ...dot, background: muted ? 'var(--c-red)' : 'var(--c-green)' }} />
            <span style={{ fontSize:'0.8rem' }}>You {muted ? '(muted)' : ''}</span>
          </div>
          {peers.map(p => (
            <div key={p.socketId} style={peerItem}>
              <audio ref={el => { if (el) audioRefs.current[p.socketId] = el; }} autoPlay playsInline />
              <div style={{ ...dot, background: p.isMuted ? 'var(--c-red)' : 'var(--c-green)' }} />
              <span style={{ fontSize:'0.8rem' }}>{p.username} {p.isMuted ? '(muted)' : ''}</span>
            </div>
          ))}
          {peers.length === 0 && (
            <p style={{ fontSize:'0.78rem', color:'var(--c-text-dim)', padding:'4px 0' }}>No one else on voice yet</p>
          )}
        </div>
      )}
    </div>
  );
}

const panel    = { borderBottom:'1px solid var(--c-border)', padding:'0 0 4px', flexShrink:0 };
const header   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px' };
const peerList = { padding:'4px 16px 8px', display:'flex', flexDirection:'column', gap:6 };
const peerItem = { display:'flex', alignItems:'center', gap:8 };
const dot      = { width:8, height:8, borderRadius:'50%', flexShrink:0 };
