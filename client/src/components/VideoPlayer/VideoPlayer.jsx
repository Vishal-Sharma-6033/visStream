import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useRoom }   from '../../context/RoomContext';
import hlsService    from '../../services/hls.service';
import PlayerControls from './PlayerControls';

const DRIFT_THRESHOLD = 1.5; // seconds

export default function VideoPlayer({ src, isHost, roomId }) {
  const videoRef   = useRef(null);
  const { on, off, emit } = useSocket();
  const { setPlayback } = useRoom();

  const [ready,       setReady]       = useState(false);
  const [buffering,   setBuffering]   = useState(false);
  const [duration,    setDuration]    = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [playing,     setPlaying]     = useState(false);
  const [levels,      setLevels]      = useState([]);
  const [quality,     setQuality]     = useState(-1);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [stalledBy,   setStalledBy]   = useState('');

  // Suppress echo — when applying a remote command we don't re-emit
  const suppressRef = useRef(false);

  // ── Load HLS source ──────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setReady(false);
    hlsService.attach(video, (lvls) => {
      setReady(true);
      if (lvls) setLevels(lvls);
    }, (err) => console.error('HLS error:', err));
    hlsService.load(src);
    return () => hlsService.destroy();
  }, [src]);

  // ── Native video events ───────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime   = () => setCurrentTime(video.currentTime);
    const onDur    = () => setDuration(video.duration);
    const onWait   = () => { setBuffering(true);  emit('video:buffer', { isBuffering: true  }); };
    const onPlaying= () => { setBuffering(false); emit('video:buffer', { isBuffering: false }); };
    const onFullsc = () => setFullscreen(!!document.fullscreenElement);

    const onPlayEvent = () => {
      setPlaying(true);
      if (!suppressRef.current) emit('video:play', { currentTime: video.currentTime });
    };
    const onPauseEvent = () => {
      setPlaying(false);
      if (!suppressRef.current) emit('video:pause', { currentTime: video.currentTime });
    };
    const onSeekedEvent = () => {
      if (!suppressRef.current) emit('video:seek', { currentTime: video.currentTime });
    };

    video.addEventListener('timeupdate',     onTime);
    video.addEventListener('durationchange', onDur);
    video.addEventListener('waiting',        onWait);
    video.addEventListener('playing',        onPlaying);
    video.addEventListener('play',           onPlayEvent);
    video.addEventListener('pause',          onPauseEvent);
    video.addEventListener('seeked',         onSeekedEvent);
    document.addEventListener('fullscreenchange', onFullsc);

    return () => {
      video.removeEventListener('timeupdate',     onTime);
      video.removeEventListener('durationchange', onDur);
      video.removeEventListener('waiting',        onWait);
      video.removeEventListener('playing',        onPlaying);
      video.removeEventListener('play',           onPlayEvent);
      video.removeEventListener('pause',          onPauseEvent);
      video.removeEventListener('seeked',         onSeekedEvent);
      document.removeEventListener('fullscreenchange', onFullsc);
    };
  }, [emit]);

  // ── Socket sync listeners (guests + host self) ──────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyPlay = ({ currentTime: t }) => {
      suppressRef.current = true;
      if (t !== null && t !== undefined && Math.abs(video.currentTime - t) > 0.5) video.currentTime = t;
      video.play().catch(() => {});
      setPlaying(true);
      setTimeout(() => { suppressRef.current = false; }, 200);
    };

    const applyPause = ({ currentTime: t }) => {
      suppressRef.current = true;
      if (t !== null && t !== undefined && Math.abs(video.currentTime - t) > 0.5) video.currentTime = t;
      video.pause();
      setPlaying(false);
      setTimeout(() => { suppressRef.current = false; }, 200);
    };

    const applySeek = ({ currentTime: t }) => { video.currentTime = t; setCurrentTime(t); };

    const applyCorrect = ({ currentTime: t, playing: p }) => {
      if (!isHost) {
        const diff = Math.abs(video.currentTime - t);
        if (diff > DRIFT_THRESHOLD) { video.currentTime = t; setCurrentTime(t); }
        if (p && video.paused)  video.play().catch(() => {});
        if (!p && !video.paused) video.pause();
        setPlaying(p);
      }
    };

    // Host responds to sync:ping
    const handlePing = ({ targetSocketId }) => {
      if (isHost) {
        emit('sync:pong', { currentTime: video.currentTime, playing: !video.paused, targetSocketId });
      }
    };

    const applyStall = ({ username, isBuffering }) => {
      setStalledBy(isBuffering ? username : '');
    };

    on('video:play',     applyPlay);
    on('video:pause',    applyPause);
    on('video:seek',     applySeek);
    on('sync:correct',   applyCorrect);
    on('sync:ping',      handlePing);
    on('sync:stalled',   applyStall);

    return () => {
      off('video:play',   applyPlay);
      off('video:pause',  applyPause);
      off('video:seek',   applySeek);
      off('sync:correct', applyCorrect);
      off('sync:ping',    handlePing);
      off('sync:stalled', applyStall);
    };
  }, [isHost, emit, on, off]);

  // ── Control handlers ──────────────────────────────────────
  const handlePlay = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const handlePause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const handleSeek = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolume = useCallback((v) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const handleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const handleQuality = useCallback((idx) => {
    hlsService.setQuality(idx);
    setQuality(idx);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!document.fullscreenElement) container?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  return (
    <div style={wrapper}>
      {/* Video element */}
      <video
        ref={videoRef}
        style={videoStyle}
        playsInline
        onClick={playing ? handlePause : handlePlay}
      />

      {/* Buffering overlay */}
      {buffering && (
        <div style={overlay}>
          <div style={spinner} />
          <p style={{ color:'#fff', marginTop:12, fontSize:'0.88rem' }}>Buffering…</p>
        </div>
      )}

      {/* No source */}
      {!src && (
        <div style={overlay}>
          <span style={{ fontSize:'3rem' }}>🎬</span>
          <p style={{ color:'var(--c-text-muted)', marginTop:12 }}>
            {isHost ? 'No video loaded — add one from the header' : 'Waiting for host to load a video…'}
          </p>
        </div>
      )}

      {/* Network Stall Overlay */}
      {stalledBy && !buffering && (
        <div style={overlay}>
          <div style={spinner} />
          <p style={{ color:'#fff', marginTop:12, fontSize:'0.88rem' }}>Waiting for {stalledBy} to catch up…</p>
        </div>
      )}

      {/* Controls */}
      {ready && (
        <PlayerControls
          isHost={isHost}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          levels={levels}
          quality={quality}
          fullscreen={fullscreen}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onVolume={handleVolume}
          onMute={handleMute}
          onQuality={handleQuality}
          onFullscreen={handleFullscreen}
        />
      )}
    </div>
  );
}

// Styles
const wrapper   = { position:'relative', flex:1, background:'#000', display:'flex', alignItems:'center', justifyContent:'center' };
const videoStyle= { width:'100%', height:'100%', objectFit:'contain', display:'block' };
const overlay   = { position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', zIndex:10 };
const spinner   = { width:48, height:48, border:'4px solid rgba(255,255,255,0.2)', borderTopColor:'var(--c-accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' };
