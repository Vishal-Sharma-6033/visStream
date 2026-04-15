import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import webrtcService from '../../services/webrtc.service';

export default function VoiceChat() {
  const { socket, on, off, emit } = useSocket();

  const [active,  setActive]  = useState(false);
  const [muted,   setMuted]   = useState(false);
  const [peers,   setPeers]   = useState([]); // { socketId, username, stream, isMuted }
  const audioRefs = useRef({});

  // Attach remote audio stream to audio element
  const handleRemoteTrack = useCallback((socketId, stream) => {
    setPeers(p => {
      const exists = p.find(x => x.socketId === socketId);
      if (exists) return p.map(x => x.socketId === socketId ? { ...x, stream } : x);
      return [...p, { socketId, stream, username: socketId.slice(0, 6), isMuted: false }];
    });
  }, []);

  const upsertPeer = useCallback((socketId, patch) => {
    setPeers((prev) => {
      const idx = prev.findIndex((p) => p.socketId === socketId);
      if (idx === -1) return [...prev, { socketId, username: socketId.slice(0, 6), isMuted: false, ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  const joinVoice = useCallback(async () => {
    if (!socket.current) return;
    webrtcService.init(socket.current, handleRemoteTrack);
    await webrtcService.getLocalStream();
    emit('voice:join');
    setMuted(false);
    setActive(true);
  }, [socket, handleRemoteTrack, emit]);

  const leaveVoice = useCallback(() => {
    emit('voice:leave');
    webrtcService.destroy();
    setActive(false);
    setMuted(false);
    setPeers([]);
  }, [emit]);

  const toggleMute = useCallback(() => {
    const nowMuted = webrtcService.toggleMute();
    setMuted(nowMuted);
    emit('voice:mute', { isMuted: nowMuted });
  }, [emit]);

  // Handle WebRTC signaling events
  useEffect(() => {
    if (!active) return;

    const onOffer = async ({ fromSocketId, fromUsername, offer }) => {
      upsertPeer(fromSocketId, { username: fromUsername || fromSocketId.slice(0, 6) });
      await webrtcService.handleOffer(fromSocketId, offer);
    };
    const onAnswer = async ({ fromSocketId, fromUsername, answer }) => {
      upsertPeer(fromSocketId, { username: fromUsername || fromSocketId.slice(0, 6) });
      await webrtcService.handleAnswer(fromSocketId, answer);
    };
    const onIce = async ({ fromSocketId, candidate }) => {
      await webrtcService.handleIceCandidate(fromSocketId, candidate);
    };
    const onRoomUserLeave = ({ socketId }) => {
      webrtcService.disconnectPeer(socketId);
      setPeers((p) => p.filter((x) => x.socketId !== socketId));
    };
    const onVoiceParticipants = async ({ participants }) => {
      for (const peer of participants || []) {
        if (peer.socketId === socket.current?.id) continue;
        upsertPeer(peer.socketId, { username: peer.username, isMuted: !!peer.isMuted });
        await webrtcService.initiateCall(peer.socketId);
      }
    };
    const onVoiceUserJoin = async ({ socketId, username, isMuted }) => {
      if (socketId === socket.current?.id) return;
      upsertPeer(socketId, { username, isMuted: !!isMuted });
      await webrtcService.initiateCall(socketId);
    };
    const onVoiceUserLeave = ({ socketId }) => {
      webrtcService.disconnectPeer(socketId);
      setPeers((p) => p.filter((x) => x.socketId !== socketId));
    };
    const onVoiceMute = ({ socketId, isMuted, username }) => {
      upsertPeer(socketId, { isMuted: !!isMuted, ...(username ? { username } : {}) });
    };

    on('webrtc:offer',        onOffer);
    on('webrtc:answer',       onAnswer);
    on('webrtc:ice-candidate',onIce);
    on('room:user-left',      onRoomUserLeave);
    on('voice:participants',  onVoiceParticipants);
    on('voice:user-joined',   onVoiceUserJoin);
    on('voice:user-left',     onVoiceUserLeave);
    on('voice:mute',          onVoiceMute);

    return () => {
      off('webrtc:offer',        onOffer);
      off('webrtc:answer',       onAnswer);
      off('webrtc:ice-candidate',onIce);
      off('room:user-left',      onRoomUserLeave);
      off('voice:participants',  onVoiceParticipants);
      off('voice:user-joined',   onVoiceUserJoin);
      off('voice:user-left',     onVoiceUserLeave);
      off('voice:mute',          onVoiceMute);
    };
  }, [active, on, off, socket, upsertPeer]);

  useEffect(() => {
    return () => {
      webrtcService.destroy();
    };
  }, []);

  // Attach streams to audio elements
  useEffect(() => {
    peers.forEach(({ socketId, stream }) => {
      if (audioRefs.current[socketId] && stream) {
        audioRefs.current[socketId].srcObject = stream;
      }
    });
  }, [peers]);

  return (
    <section style={panel}>
      <div style={header}>
        <span style={{ fontWeight:700, fontSize:'0.88rem' }}>Voice Channel</span>
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
            <span style={{ fontSize:'0.8rem' }}>You {muted ? '(muted)' : '(live)'}</span>
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
    </section>
  );
}

const panel    = { borderBottom:'1px solid var(--c-border)', padding:'0 0 8px', flexShrink:0, background:'rgba(255,255,255,0.01)' };
const header   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px 10px' };
const peerList = { padding:'4px 16px 10px', display:'flex', flexDirection:'column', gap:8 };
const peerItem = { display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.03)', border:'1px solid var(--c-border)', borderRadius:10, padding:'6px 8px' };
const dot      = { width:8, height:8, borderRadius:'50%', flexShrink:0 };
