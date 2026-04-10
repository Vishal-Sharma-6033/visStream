import React, { memo } from 'react';

const fmt = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
};

const ChatMessage = memo(({ message, isOwn }) => {
  if (message.type === 'system') {
    return <div style={system}>{message.content}</div>;
  }
  return (
    <div style={{ ...row, ...(isOwn ? rowOwn : {}) }}>
      {!isOwn && <img src={message.avatar} alt={message.username} style={avatarImg} />}
      <div style={{ maxWidth:'78%' }}>
        {!isOwn && <div style={name}>{message.username}</div>}
        <div style={{ ...bubble, ...(isOwn ? bubbleOwn : bubbleOther) }}>
          {message.content}
        </div>
        <div style={{ ...ts, ...(isOwn ? { textAlign:'right' } : {}) }}>{fmt(message.timestamp)}</div>
      </div>
      {isOwn && <img src={message.avatar} alt={message.username} style={avatarImg} />}
    </div>
  );
});

export default ChatMessage;

const row        = { display:'flex', gap:8, padding:'4px 10px', alignItems:'flex-end' };
const rowOwn     = { flexDirection:'row-reverse' };
const avatarImg  = { width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0, marginBottom:2, border:'1px solid var(--c-border)' };
const name       = { fontSize:'0.7rem', color:'var(--c-text-dim)', marginBottom:3, marginLeft:2, letterSpacing:'0.02em' };
const bubble     = { borderRadius:12, padding:'8px 12px', fontSize:'0.84rem', lineHeight:1.55, wordBreak:'break-word', border:'1px solid transparent' };
const bubbleOther= { background:'rgba(255,255,255,0.06)', color:'var(--c-text)', borderBottomLeftRadius:4, borderColor:'var(--c-border)' };
const bubbleOwn  = { background:'linear-gradient(135deg, #6c63ff, #4f8dfd)', color:'#fff', borderBottomRightRadius:4, boxShadow:'0 8px 18px rgba(79,141,253,0.25)' };
const ts         = { fontSize:'0.66rem', color:'var(--c-text-dim)', marginTop:3, marginLeft:3 };
const system     = { textAlign:'center', fontSize:'0.75rem', color:'var(--c-text-dim)', padding:'4px 0', fontStyle:'italic' };
