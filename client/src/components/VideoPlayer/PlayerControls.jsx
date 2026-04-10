import React, { useCallback } from 'react';

const fmt = (s) => {
  const t = Math.round(s || 0);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`;
};

export default function PlayerControls({
  isHost, playing, currentTime, duration,
  volume, muted, levels, quality, fullscreen,
  onPlay, onPause, onSeek, onVolume, onMute, onQuality, onFullscreen,
}) {
  const pct = duration ? (currentTime / duration) * 100 : 0;

  const handleSeekBar = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - rect.left) / rect.width) * duration);
  }, [duration, onSeek]);

  return (
    <div style={bar}>
      {/* Progress bar */}
      <div
        style={{ ...seekRow, cursor: 'pointer' }}
        onClick={handleSeekBar}
        title="Seek"
      >
        <div style={seekTrack}>
          <div style={{ ...seekFill, width:`${pct}%` }} />
          <div style={{ ...seekThumb, left:`${pct}%` }} />
        </div>
      </div>

      {/* Controls row */}
      <div style={controls}>
        {/* Play / Pause */}
        <button
          id="player-play-pause"
          className="btn-icon"
          onClick={playing ? onPause : onPlay}
          title={playing ? 'Pause' : 'Play'}
          style={iconBtn}
        >
          {playing ? '⏸' : '▶️'}
        </button>

        {/* Time */}
        <span style={time}>{fmt(currentTime)} / {fmt(duration)}</span>

        <div style={{ flex:1 }} />

        {/* Volume */}
        <button className="btn-icon" onClick={onMute} style={iconBtn} title="Toggle mute">
          {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </button>
        <input
          type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          style={volSlider}
          title="Volume"
        />

        {/* Quality selector */}
        {levels.length > 0 && (
          <select
            value={quality}
            onChange={(e) => onQuality(Number(e.target.value))}
            style={qualSel}
            title="Video quality"
          >
            <option value={-1}>Auto</option>
            {levels.map((l) => <option key={l.index} value={l.index}>{l.name}</option>)}
          </select>
        )}

        {/* Fullscreen */}
        <button className="btn-icon" onClick={onFullscreen} style={iconBtn} title="Fullscreen">
          {fullscreen ? '⛶' : '⛶'}
        </button>
      </div>
    </div>
  );
}

const bar      = { position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent, rgba(0,0,0,0.85))', padding:'12px 16px 12px', zIndex:20 };
const seekRow  = { marginBottom:8 };
const seekTrack= { position:'relative', height:4, background:'rgba(255,255,255,0.2)', borderRadius:2 };
const seekFill = { position:'absolute', top:0, left:0, height:'100%', background:'var(--c-accent)', borderRadius:2, transition:'width 0.1s linear' };
const seekThumb= { position:'absolute', top:'50%', transform:'translate(-50%,-50%)', width:12, height:12, borderRadius:'50%', background:'#fff', boxShadow:'0 0 6px rgba(0,0,0,0.5)' };
const controls = { display:'flex', alignItems:'center', gap:8 };
const iconBtn  = { background:'rgba(255,255,255,0.1)', border:'none', borderRadius:6, color:'#fff', cursor:'pointer', width:34, height:34, fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' };
const time     = { fontSize:'0.8rem', color:'rgba(255,255,255,0.8)', minWidth:90 };
const volSlider= { width:70, accentColor:'var(--c-accent)', cursor:'pointer' };
const qualSel  = { background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:4, padding:'2px 6px', fontSize:'0.78rem', cursor:'pointer' };
