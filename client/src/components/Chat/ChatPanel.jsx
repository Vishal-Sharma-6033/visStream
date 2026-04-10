import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useRoom }   from '../../context/RoomContext';
import { useAuth }   from '../../context/AuthContext';
import ChatMessage   from './ChatMessage';

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🍿','💯'];

export default function ChatPanel({ roomId }) {
  const { emit, on, off } = useSocket();
  const { user } = useAuth();
  const { messages, typingUsers } = useRoom();

  const [input,      setInput]      = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [reactions,  setReactions]  = useState([]); // floating emoji overlays

  const bottomRef  = useRef(null);
  const typingTimer= useRef(null);

  // Auto-scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Floating emoji reactions
  useEffect(() => {
    const handler = ({ emoji, id }) => {
      const x = 60 + Math.random() * (window.innerWidth - 180);
      const y = window.innerHeight - 200 - Math.random() * 200;
      setReactions(r => [...r, { emoji, id, x, y }]);
      setTimeout(() => setReactions(r => r.filter(e => e.id !== id)), 2500);
    };
    on('chat:reaction', handler);
    return () => off('chat:reaction', handler);
  }, [on, off]);

  const sendMessage = useCallback((e) => {
    e.preventDefault();
    if (!input.trim()) return;
    emit('chat:message', { content: input.trim() });
    setInput('');
  }, [input, emit]);

  const sendReaction = useCallback((emoji) => {
    emit('chat:reaction', { emoji });
    setShowEmojis(false);
  }, [emit]);

  const handleTyping = (e) => {
    setInput(e.target.value);
    emit('chat:typing', { isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emit('chat:typing', { isTyping: false }), 1200);
  };

  const others = typingUsers.filter(u => u !== user?.username);

  return (
    <>
      {/* Floating emoji reactions */}
      {reactions.map(r => (
        <div key={r.id} className="emoji-float" style={{ left: r.x, bottom: r.y }}>{r.emoji}</div>
      ))}

      <div style={panel}>
        {/* Header */}
        <div style={header}>
          <span style={{ fontWeight:700, fontSize:'0.9rem' }}>💬 Chat</span>
          <span style={{ fontSize:'0.75rem', color:'var(--c-text-dim)' }}>{messages.length} messages</span>
        </div>

        {/* Messages */}
        <div style={msgList}>
          {messages.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--c-text-dim)', fontSize:'0.85rem' }}>
              <p>🍿 No messages yet</p>
              <p style={{ marginTop:6 }}>Say hello!</p>
            </div>
          )}
          {messages.map((msg, i) => <ChatMessage key={i} message={msg} isOwn={msg.username === user?.username} />)}
          {others.length > 0 && (
            <div style={{ padding:'4px 12px', fontSize:'0.75rem', color:'var(--c-text-dim)', fontStyle:'italic' }}>
              {others.join(', ')} {others.length === 1 ? 'is' : 'are'} typing…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={inputRow}>
          <div style={{ position:'relative' }}>
            <button
              id="emoji-picker-btn"
              className="btn-icon"
              onClick={() => setShowEmojis(s => !s)}
              title="Send reaction"
              style={{ flexShrink:0 }}
            >😊</button>
            {showEmojis && (
              <div style={emojiPicker}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => sendReaction(e)} style={emojiBtn}>{e}</button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} style={{ display:'flex', gap:6, flex:1 }}>
            <input
              id="chat-input"
              className="input"
              style={{ flex:1, fontSize:'0.85rem', padding:'8px 12px' }}
              placeholder="Say something…"
              value={input}
              onChange={handleTyping}
              maxLength={1000}
              autoComplete="off"
            />
            <button id="chat-send-btn" className="btn btn-primary btn-sm" type="submit" disabled={!input.trim()}>→</button>
          </form>
        </div>
      </div>
    </>
  );
}

const panel    = { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 };
const header   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--c-border)', flexShrink:0 };
const msgList  = { flex:1, overflowY:'auto', padding:'8px 0', display:'flex', flexDirection:'column', gap:2 };
const inputRow = { display:'flex', gap:8, padding:'12px', borderTop:'1px solid var(--c-border)', alignItems:'center', flexShrink:0 };
const emojiPicker = { position:'absolute', bottom:'110%', left:0, background:'var(--c-surface2)', border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', padding:8, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, boxShadow:'var(--shadow-lg)', zIndex:100 };
const emojiBtn = { background:'none', border:'none', cursor:'pointer', fontSize:'1.4rem', padding:4, borderRadius:4, transition:'transform 0.15s' };
