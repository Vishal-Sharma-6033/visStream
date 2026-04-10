import React, { useCallback, useMemo, useState } from 'react';

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
  bufferedPercent,
  onPlay, onPause, onSeek, onVolume, onMute, onQuality, onFullscreen,
  onSkipBack, onSkipForward,
}) {
  const [hoverPct, setHoverPct] = useState(null);
  const pct = duration ? (currentTime / duration) * 100 : 0;

  const hoverTime = useMemo(() => {
    if (hoverPct === null || !duration) return null;
    return (hoverPct / 100) * duration;
  }, [hoverPct, duration]);

  const handleSeekBar = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(((e.clientX - rect.left) / rect.width) * duration);
  }, [duration, onSeek]);

  const handleSeekHover = useCallback((e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pctValue = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setHoverPct(pctValue);
  }, [duration]);

  const handleSeekLeave = useCallback(() => setHoverPct(null), []);

  return (
    <div className={`player-controls-shell ${fullscreen ? 'is-fullscreen' : ''}`}>
      {/* Progress bar */}
      <div
        className="player-seek-row"
        onClick={handleSeekBar}
        onMouseMove={handleSeekHover}
        onMouseLeave={handleSeekLeave}
        title="Seek"
      >
        <div className="player-seek-track">
          <div className="player-seek-buffer" style={{ width: `${bufferedPercent || 0}%` }} />
          <div className="player-seek-fill" style={{ width:`${pct}%` }} />
          <div className="player-seek-thumb" style={{ left:`${pct}%` }} />
          {hoverPct !== null && (
            <>
              <div className="player-seek-hover-line" style={{ left: `${hoverPct}%` }} />
              <div className="player-seek-preview" style={{ left: `${hoverPct}%` }}>
                {fmt(hoverTime)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="player-controls-row">
        <div className="player-left-cluster">
        <button
          id="player-play-pause"
          className={`player-icon-btn player-play-btn ${playing ? 'is-playing' : ''}`}
          onClick={playing ? onPause : onPlay}
          title={playing ? 'Pause' : 'Play'}
        >
          <span className="icon-text">{playing ? '❚❚' : '▶'}</span>
        </button>

        <button className="player-icon-btn" onClick={onSkipBack} title="Back 10s">
          <span className="icon-text">↺10</span>
        </button>

        <button className="player-icon-btn" onClick={onSkipForward} title="Forward 10s">
          <span className="icon-text">10↻</span>
        </button>

        <span className="player-time-label">{fmt(currentTime)} / {fmt(duration)}</span>
        </div>

        <div style={{ flex:1 }} />

        <div className="player-right-cluster">
        <button className="player-icon-btn" onClick={onMute} title="Toggle mute">
          <span className="icon-text">{muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
        </button>
        <input
          type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="player-volume-slider"
          title="Volume"
        />

        {levels.length > 0 && (
          <select
            value={quality}
            onChange={(e) => onQuality(Number(e.target.value))}
            className="player-quality-select"
            title="Video quality"
          >
            <option value={-1}>Auto</option>
            {levels.map((l) => <option key={l.index} value={l.index}>{l.name}</option>)}
          </select>
        )}

        <button className="player-icon-btn" onClick={onFullscreen} title="Fullscreen">
          <span className="icon-text">{fullscreen ? '🗗' : '🗖'}</span>
        </button>
        </div>
      </div>
    </div>
  );
}
