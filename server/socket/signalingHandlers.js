function registerSignalingHandlers(io, socket) {
  const onOffer = (payload, callback = () => {}) => {
    if (!payload || typeof payload.targetSocketId !== "string" || !payload.offer) {
      callback({ ok: false, error: "Invalid offer payload" });
      return;
    }

    const outbound = {
      fromSocketId: socket.id,
      roomId: payload.roomId,
      offer: payload.offer
    };

    io.to(payload.targetSocketId).emit("offer", outbound);
    io.to(payload.targetSocketId).emit("webrtc:offer", outbound);

    callback({ ok: true });
  };

  const onAnswer = (payload, callback = () => {}) => {
    if (!payload || typeof payload.targetSocketId !== "string" || !payload.answer) {
      callback({ ok: false, error: "Invalid answer payload" });
      return;
    }

    const outbound = {
      fromSocketId: socket.id,
      roomId: payload.roomId,
      answer: payload.answer
    };

    io.to(payload.targetSocketId).emit("answer", outbound);
    io.to(payload.targetSocketId).emit("webrtc:answer", outbound);

    callback({ ok: true });
  };

  const onIceCandidate = (payload, callback = () => {}) => {
    if (!payload || typeof payload.targetSocketId !== "string" || !payload.candidate) {
      callback({ ok: false, error: "Invalid ICE payload" });
      return;
    }

    const outbound = {
      fromSocketId: socket.id,
      roomId: payload.roomId,
      candidate: payload.candidate
    };

    io.to(payload.targetSocketId).emit("ice-candidate", outbound);
    io.to(payload.targetSocketId).emit("webrtc:ice-candidate", outbound);

    callback({ ok: true });
  };

  socket.on("offer", onOffer);
  socket.on("webrtc:offer", onOffer);

  socket.on("answer", onAnswer);
  socket.on("webrtc:answer", onAnswer);

  socket.on("ice-candidate", onIceCandidate);
  socket.on("webrtc:ice-candidate", onIceCandidate);
}

module.exports = registerSignalingHandlers;
