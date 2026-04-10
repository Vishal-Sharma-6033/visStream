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

const row        = { display:'flex', gap:8, padding:'4px 12px', alignItems:'flex-end' };
const rowOwn     = { flexDirection:'row-reverse' };
const avatarImg  = { width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0, marginBottom:2 };
const name       = { fontSize:'0.72rem', color:'var(--c-text-dim)', marginBottom:2, marginLeft:2 };
const bubble     = { borderRadius:12, padding:'7px 12px', fontSize:'0.85rem', lineHeight:1.5, wordBreak:'break-word' };
const bubbleOther= { background:'var(--c-surface3)', color:'var(--c-text)', borderBottomLeftRadius:2 };
const bubbleOwn  = { background:'var(--c-accent)', color:'#fff', borderBottomRightRadius:2 };
const ts         = { fontSize:'0.68rem', color:'var(--c-text-dim)', marginTop:2, marginLeft:2 };
const system     = { textAlign:'center', fontSize:'0.75rem', color:'var(--c-text-dim)', padding:'4px 0', fontStyle:'italic' };
