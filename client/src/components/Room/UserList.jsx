import React, { memo } from 'react';
import { useRoom } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';

const UserList = memo(() => {
  const { members } = useRoom();
  const { user } = useAuth();

  const sorted = [...members].sort((a, b) => (a.isHost === b.isHost ? 0 : a.isHost ? -1 : 1));

  return (
    <section style={panel}>
      <div style={header}>
        <span style={{ fontWeight:700, fontSize:'0.88rem', letterSpacing:'0.01em' }}>Live Members</span>
        <span className="badge">{members.length}</span>
      </div>
      <div style={list}>
        {sorted.map((m) => {
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
                  {m.isHost && <span style={hostBadge}>Host</span>}
                </div>
              </div>
            </div>
          );
        })}
        {members.length === 0 && (
          <p style={{ fontSize:'0.8rem', color:'var(--c-text-dim)', padding:'8px 16px' }}>No members yet</p>
        )}
      </div>
    </section>
  );
});

export default UserList;

const panel    = { borderBottom:'1px solid var(--c-border)', flexShrink:0, background:'rgba(255,255,255,0.01)' };
const header   = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px 10px' };
const list     = { padding:'4px 8px 12px', maxHeight:180, overflowY:'auto' };
const item     = { display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, transition:'background 0.15s' };
const avatarWrap={ position:'relative', flexShrink:0 };
const avatarImg= { width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'1px solid var(--c-border)' };
const bufferBadge={ position:'absolute', bottom:-2, right:-2, fontSize:'0.6rem' };
const name     = { fontSize:'0.84rem', fontWeight:500, color:'var(--c-text)', display:'flex', alignItems:'center', gap:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' };
const meBadge  = { fontSize:'0.64rem', background:'rgba(108,99,255,0.2)', color:'var(--c-accent)', borderRadius:999, padding:'1px 6px', fontWeight:700 };
const hostBadge= { fontSize:'0.64rem', background:'rgba(245,158,11,0.14)', color:'var(--c-amber)', borderRadius:999, padding:'1px 6px', fontWeight:700, border:'1px solid rgba(245,158,11,0.35)' };
