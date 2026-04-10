import React from 'react';

export default function LoadingSpinner({ fullScreen = false, message = 'Loading…' }) {
  return (
    <div style={fullScreen ? fullSc : inline}>
      <div style={ring} />
      {message && <p style={label}>{message}</p>}
    </div>
  );
}

const fullSc  = { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, background:'var(--c-bg)' };
const inline  = { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, gap:12 };
const ring    = { width:44, height:44, border:'4px solid rgba(108,99,255,0.2)', borderTopColor:'var(--c-accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' };
const label   = { color:'var(--c-text-muted)', fontSize:'0.88rem' };
