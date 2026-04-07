import { memo, useEffect, useMemo, useRef, useState } from "react";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function VoiceChat({ socket, roomId, roomUsers }) {
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const reconnectTimerRef = useRef(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [remotePeers, setRemotePeers] = useState([]);
  const [voiceError, setVoiceError] = useState("");

  const activePeerIds = useMemo(
    () => (roomUsers || []).map((user) => user.socketId).filter(Boolean),
    [roomUsers]
  );

  useEffect(() => {
    let active = true;

    async function initLocalAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
      } catch (_error) {
        setVoiceError("Microphone access denied or unavailable");
      }
    }

    initLocalAudio();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }

    function upsertRemoteStream(socketId, stream) {
      setRemotePeers((prev) => {
        const exists = prev.some((peer) => peer.socketId === socketId);
        if (exists) {
          return prev.map((peer) => (peer.socketId === socketId ? { ...peer, stream } : peer));
        }
        return [...prev, { socketId, stream }];
      });
    }

    function removePeer(socketId) {
      const peer = peersRef.current.get(socketId);
      if (peer?.pc) {
        peer.pc.close();
      }
      peersRef.current.delete(socketId);

      const timer = reconnectTimerRef.current.get(socketId);
      if (timer) {
        clearTimeout(timer);
      }
      reconnectTimerRef.current.delete(socketId);

      setRemotePeers((prev) => prev.filter((entry) => entry.socketId !== socketId));
    }

    async function makeOffer(socketId, pc) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.emit("offer", {
        roomId,
        targetSocketId: socketId,
        offer
      });
    }

    function createPeer(socketId) {
      if (!socketId || socketId === socket.id) {
        return null;
      }

      const existing = peersRef.current.get(socketId);
      if (existing?.pc) {
        return existing.pc;
      }

      const pc = new RTCPeerConnection(rtcConfig);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        socket.emit("ice-candidate", {
          roomId,
          targetSocketId: socketId,
          candidate: event.candidate
        });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          upsertRemoteStream(socketId, stream);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          if (!reconnectTimerRef.current.has(socketId)) {
            const timeoutId = setTimeout(() => {
              reconnectTimerRef.current.delete(socketId);
              removePeer(socketId);
              createPeer(socketId);
              const nextPeer = peersRef.current.get(socketId)?.pc;
              if (nextPeer) {
                makeOffer(socketId, nextPeer).catch(() => null);
              }
            }, 1200);
            reconnectTimerRef.current.set(socketId, timeoutId);
          }
        }
      };

      peersRef.current.set(socketId, { pc });
      return pc;
    }

    async function handleOffer(payload) {
      if (!payload || payload.roomId !== roomId || !payload.fromSocketId || !payload.offer) {
        return;
      }

      const pc = createPeer(payload.fromSocketId);
      if (!pc) {
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        roomId,
        targetSocketId: payload.fromSocketId,
        answer
      });
    }

    async function handleAnswer(payload) {
      if (!payload || payload.roomId !== roomId || !payload.fromSocketId || !payload.answer) {
        return;
      }

      const pc = peersRef.current.get(payload.fromSocketId)?.pc;
      if (!pc) {
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    }

    async function handleIce(payload) {
      if (!payload || payload.roomId !== roomId || !payload.fromSocketId || !payload.candidate) {
        return;
      }

      const pc = peersRef.current.get(payload.fromSocketId)?.pc;
      if (!pc) {
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (_error) {
        // Ignore stale packets from short reconnect windows.
      }
    }

    const onUserLeft = (payload) => {
      if (payload?.socketId) {
        removePeer(payload.socketId);
      }
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIce);
    socket.on("room:user-left", onUserLeft);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIce);
      socket.off("room:user-left", onUserLeft);

      peersRef.current.forEach((entry) => entry.pc?.close());
      peersRef.current.clear();

      reconnectTimerRef.current.forEach((timer) => clearTimeout(timer));
      reconnectTimerRef.current.clear();

      setRemotePeers([]);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }

    const validPeers = new Set(activePeerIds.filter((id) => id !== socket.id));

    validPeers.forEach((socketId) => {
      if (peersRef.current.has(socketId)) {
        return;
      }

      const pc = new RTCPeerConnection(rtcConfig);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }
        socket.emit("ice-candidate", {
          roomId,
          targetSocketId: socketId,
          candidate: event.candidate
        });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) {
          return;
        }
        setRemotePeers((prev) => {
          const exists = prev.some((peer) => peer.socketId === socketId);
          if (exists) {
            return prev.map((peer) => (peer.socketId === socketId ? { ...peer, stream } : peer));
          }
          return [...prev, { socketId, stream }];
        });
      };

      peersRef.current.set(socketId, { pc });

      pc.createOffer({ offerToReceiveAudio: true })
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          socket.emit("offer", {
            roomId,
            targetSocketId: socketId,
            offer
          });
        })
        .catch(() => null);
    });

    peersRef.current.forEach((entry, socketId) => {
      if (!validPeers.has(socketId)) {
        entry.pc?.close();
        peersRef.current.delete(socketId);
        setRemotePeers((prev) => prev.filter((peer) => peer.socketId !== socketId));
      }
    });
  }, [activePeerIds, roomId, socket]);

  function toggleMute() {
    if (!localStreamRef.current) {
      return;
    }

    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }

  return (
    <section className="panel voice-card">
      <div className="voice-head">
        <h3>Voice</h3>
        <span className="muted">Peers: {remotePeers.length}</span>
      </div>

      <button className="btn" type="button" onClick={toggleMute}>
        {isMuted ? "Unmute" : "Mute"}
      </button>

      {voiceError ? <p className="error-text">{voiceError}</p> : null}

      <div className="remote-audio-list">
        {remotePeers.map((peer) => (
          <audio
            key={peer.socketId}
            autoPlay
            playsInline
            ref={(node) => {
              if (node && node.srcObject !== peer.stream) {
                node.srcObject = peer.stream;
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(VoiceChat);
