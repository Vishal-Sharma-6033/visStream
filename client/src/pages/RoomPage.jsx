import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomProvider, useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import ChatPanel   from '../components/Chat/ChatPanel';
import UserList    from '../components/Room/UserList';
import RoomHeader  from '../components/Room/RoomHeader';
import VoiceChat   from '../components/Voice/VoiceChat';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import api from '../services/api.service';

/* Inner component consumes RoomContext */
function RoomInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { emit, on, off } = useSocket();
  const {
    room, isHost,
    setRoom, setMembers, setIsHost, addMessage, setMessages, setPlayback, setTyping, resetRoom,
  } = useRoom();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    api.get(`/api/rooms/${id}`)
      .then(({ data }) => { setRoom(data.room); setLoading(false); })
      .catch(() => { setError('Room not found or has been closed.'); setLoading(false); });
  }, [id]);

  // ── Socket events ──────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    emit('room:join', { roomId: id });

    const handlers = {
      'room:joined': ({ isHost: h, playbackState, members, messages, videoUrl: vUrl }) => {
        setIsHost(h);
        setMembers(members);
        setMessages(messages);
        if (playbackState) setPlayback(playbackState);
        if (vUrl)          setVideoUrl(vUrl);
      },
      'room:user-joined': ({ members }) => setMembers(members),
      'room:user-left':   ({ members }) => setMembers(members),
      'room:host-assigned': () => setIsHost(true),
      'room:host-changed':  ({ members }) => setMembers(members),
      'chat:message': (msg) => addMessage(msg),
      'chat:typing':  ({ username, isTyping }) => setTyping({ username, isTyping }),
      'video:change': ({ videoUrl: u }) => { setVideoUrl(u); setPlayback({ playing:false, currentTime:0 }); },
      'error': ({ message }) => setError(message),
    };

    Object.entries(handlers).forEach(([ev, fn]) => on(ev, fn));
    return () => {
      Object.entries(handlers).forEach(([ev, fn]) => off(ev, fn));
      emit('room:leave');
      resetRoom();
    };
  }, [room?.roomId]);

  if (loading) return <LoadingSpinner fullScreen message="Joining room…" />;
  if (error)   return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <span style={{ fontSize:'3rem' }}>😕</span>
      <h2>{error}</h2>
      <button className="btn btn-ghost" onClick={() => navigate('/')}>← Go Home</button>
    </div>
  );

  return (
    <div style={layout}>
      {/* Top bar */}
      <RoomHeader roomId={id} roomName={room?.name} isHost={isHost} />

      {/* Main area */}
      <div style={main}>
        {/* Video + controls */}
        <div style={videoArea}>
          <VideoPlayer
            src={videoUrl || room?.videoUrl}
            isHost={isHost}
            roomId={id}
          />
        </div>

        {/* Right sidebar */}
        <aside style={sidebar}>
          <UserList />
          <VoiceChat roomId={id} />
          <ChatPanel roomId={id} />
        </aside>
      </div>
    </div>
  );
}

/* Outer component provides RoomContext */
export default function RoomPage() {
  return (
    <RoomProvider>
      <RoomInner />
    </RoomProvider>
  );
}

const layout    = { display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--c-bg)' };
const main      = { display:'flex', flex:1, overflow:'hidden' };
const videoArea = { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' };
const sidebar   = { width:340, display:'flex', flexDirection:'column', borderLeft:'1px solid var(--c-border)', overflow:'hidden', flexShrink:0 };
