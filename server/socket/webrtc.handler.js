/**
 * WebRTC signaling via Socket.IO.
 * Implements a full-mesh topology for small rooms (≤ 8 peers).
 * Each peer creates an offer to every other peer on join.
 */
const webrtcHandler = (io, socket) => {
  // Relay offer to a specific peer
  socket.on('webrtc:offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc:offer', {
      fromSocketId: socket.id,
      fromUsername: socket.user.username,
      offer,
    });
  });

  // Relay answer back to the offering peer
  socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc:answer', {
      fromSocketId: socket.id,
      answer,
    });
  });

  // Relay ICE candidates
  socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc:ice-candidate', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // Mute/unmute broadcast
  socket.on('voice:mute', ({ isMuted }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    socket.to(roomId).emit('voice:mute', { socketId: socket.id, username: socket.user.username, isMuted });
  });
};

module.exports = webrtcHandler;
