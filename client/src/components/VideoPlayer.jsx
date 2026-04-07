import Hls from "hls.js";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { getStreamUrl } from "../services/api";

function VideoPlayer({ socket, roomId, roomState, isHost }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const remoteChangeRef = useRef(false);
  const heartbeatRef = useRef(null);
  const seekDebounceRef = useRef(null);
  const [isBuffering, setIsBuffering] = useState(true);

  const streamUrl = useMemo(() => getStreamUrl(roomId), [roomId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    function onWaiting() {
      setIsBuffering(true);
    }

    function onCanPlay() {
      setIsBuffering(false);
    }

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onCanPlay);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        enableWorker: true
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    }

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onCanPlay);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }

    const applyState = (payload) => {
      const video = videoRef.current;
      if (!video || !payload) {
        return;
      }

      remoteChangeRef.current = true;

      const targetTime = Number(payload.currentTime) || 0;
      if (Math.abs(video.currentTime - targetTime) > 0.35) {
        video.currentTime = targetTime;
      }

      if (payload.isPlaying === true) {
        video.play().catch(() => null);
      }

      if (payload.isPlaying === false) {
        video.pause();
      }

      remoteChangeRef.current = false;
    };

    const onPlaySync = (payload) => {
      if (payload?.roomId !== roomId || !videoRef.current) {
        return;
      }

      applyState({ ...payload, isPlaying: true });
    };

    const onPauseSync = (payload) => {
      if (payload?.roomId !== roomId || !videoRef.current) {
        return;
      }

      applyState({ ...payload, isPlaying: false });
    };

    const onSeekSync = (payload) => {
      if (payload?.roomId !== roomId || !videoRef.current) {
        return;
      }

      applyState(payload);
    };

    const onSync = (payload) => {
      if (payload?.roomId !== roomId || !videoRef.current) {
        return;
      }

      const drift = Math.abs(videoRef.current.currentTime - (Number(payload.currentTime) || 0));
      if (drift > 1) {
        applyState(payload);
      }
    };

    socket.on("play", onPlaySync);
    socket.on("sync:play", onPlaySync);
    socket.on("pause", onPauseSync);
    socket.on("sync:pause", onPauseSync);
    socket.on("seek", onSeekSync);
    socket.on("sync:seek", onSeekSync);
    socket.on("sync", onSync);

    socket.emit("sync:request", { roomId }, (ack) => {
      if (!ack?.ok || !ack?.state || !videoRef.current) {
        return;
      }

      applyState(ack.state);
    });

    heartbeatRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      if (isHost) {
        socket.emit("sync", {
          roomId,
          currentTime: video.currentTime,
          isPlaying: !video.paused
        });
      } else {
        socket.emit("sync:request", { roomId }, (ack) => {
          if (!ack?.ok || !ack?.state || !videoRef.current) {
            return;
          }

          const hostTime = Number(ack.state.currentTime) || 0;
          const drift = Math.abs(videoRef.current.currentTime - hostTime);
          if (drift > 1) {
            applyState(ack.state);
          }
        });
      }
    }, 4000);

    return () => {
      socket.off("play", onPlaySync);
      socket.off("sync:play", onPlaySync);
      socket.off("pause", onPauseSync);
      socket.off("sync:pause", onPauseSync);
      socket.off("seek", onSeekSync);
      socket.off("sync:seek", onSeekSync);
      socket.off("sync", onSync);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [socket, roomId, isHost]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !socket || !roomId || !isHost) {
      return;
    }

    const emitPlay = () => {
      if (remoteChangeRef.current) {
        return;
      }

      socket.emit("play", { roomId, currentTime: video.currentTime });
    };

    const emitPause = () => {
      if (remoteChangeRef.current) {
        return;
      }

      socket.emit("pause", { roomId, currentTime: video.currentTime });
    };

    const emitSeeked = () => {
      if (remoteChangeRef.current) {
        return;
      }

      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current);
      }

      seekDebounceRef.current = setTimeout(() => {
        socket.emit("seek", { roomId, currentTime: video.currentTime });
      }, 160);
    };

    video.addEventListener("play", emitPlay);
    video.addEventListener("pause", emitPause);
    video.addEventListener("seeked", emitSeeked);

    return () => {
      video.removeEventListener("play", emitPlay);
      video.removeEventListener("pause", emitPause);
      video.removeEventListener("seeked", emitSeeked);

      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current);
        seekDebounceRef.current = null;
      }
    };
  }, [socket, roomId, isHost]);

  return (
    <section className="panel video-card">
      <div className="video-head">
        <h2>Now Watching</h2>
        <div className="badges">
          <span className="chip">Room: {roomId}</span>
          <span className={`chip ${roomState?.isPlaying ? "live" : "idle"}`}>
            {roomState?.isPlaying ? "Playing" : "Paused"}
          </span>
        </div>
      </div>

      <div className="video-wrap">
        <video ref={videoRef} controls playsInline className="video-element" />
        {isBuffering ? <div className="buffer-indicator">Buffering stream...</div> : null}
      </div>

      <p className="muted">{isHost ? "You are host: play/pause/seek controls everyone." : "Host controls playback sync."}</p>
    </section>
  );
}

export default memo(VideoPlayer);
