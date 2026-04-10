import React, { memo } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';

const UserList = memo(() => {
  const { members, isHost } = useRoom();
  const { user } = useAuth();

  return (
    <div style={panel}>
      <div style={header}>
        <span style={{ fontWeight:700, fontSize:'0.88rem' }}>👥 Viewers</span>
        <span className="badge">{members.length}</span>
      </div>
      <div style={list}>
        {members.map((m) => {
          const isMe   = m.userId === user?._id?.toString() || m.userId === user?._id;
          return (
            <div key={m.socketId || m.userId} style={item}>
              <div style={avatarWrap}>
                <img src={m.avatar} alt={m.username} style={avatarImg} />
                {m.isBuffering && <div style={bufferBadge}>⏳</div>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={name}>
                  {m.username}
                  {isMe && <span style={meBadge}>You</span>}
                </div>
              </div>
              {/* Host crown */}
              {isHost && m.socketId && <span title="Host" style={{ fontSize:'0.9rem' }}>👑</span>}
            </div>
          );
        })}
        {members.length === 0 && (
          <p style={{ fontSize:'0.8rem', color:'var(--c-text-dim)', padding:'8px 16px' }}>No members yet</p>
        )}
      </div>
    </div>
  );
});

export default UserList;

const panel    = { borderBottom:'1px solid var(--c-border)', flexShrink:0 };
const header   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px' };
const list     = { padding:'4px 0 8px', maxHeight:160, overflowY:'auto' };
const item     = { display:'flex', alignItems:'center', gap:10, padding:'5px 16px', transition:'background 0.15s' };
const avatarWrap={ position:'relative', flexShrink:0 };
const avatarImg= { width:30, height:30, borderRadius:'50%', objectFit:'cover' };
const bufferBadge={ position:'absolute', bottom:-2, right:-2, fontSize:'0.6rem' };
const name     = { fontSize:'0.85rem', fontWeight:500, color:'var(--c-text)', display:'flex', alignItems:'center', gap:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' };
const meBadge  = { fontSize:'0.65rem', background:'rgba(108,99,255,0.2)', color:'var(--c-accent)', borderRadius:999, padding:'1px 6px', fontWeight:600 };
