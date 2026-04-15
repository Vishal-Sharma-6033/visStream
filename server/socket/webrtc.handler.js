/**
 * WebRTC signaling via Socket.IO.
 * Implements a full-mesh topology for small rooms (≤ 8 peers).
 * Each peer creates an offer to every other peer on join.
 */
const voiceRooms = new Map(); // roomId -> Map(socketId, { socketId, username, isMuted })

const getVoiceRoom = (roomId) => {
  if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
  return voiceRooms.get(roomId);
};

const removeVoiceParticipant = (io, socket) => {
  const roomId = socket.currentRoom;
  if (!roomId) return;

  const room = voiceRooms.get(roomId);
  if (!room) return;

  const removed = room.delete(socket.id);
  if (!removed) return;

  socket.to(roomId).emit('voice:user-left', { socketId: socket.id, username: socket.user.username });
  socket.to(roomId).emit('voice:mute', { socketId: socket.id, username: socket.user.username, isMuted: true });

  if (room.size === 0) voiceRooms.delete(roomId);
};

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

    const room = voiceRooms.get(roomId);
    const participant = room?.get(socket.id);
    if (participant) participant.isMuted = !!isMuted;

    socket.to(roomId).emit('voice:mute', { socketId: socket.id, username: socket.user.username, isMuted });
  });

  // Voice join
  socket.on('voice:join', () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    const room = getVoiceRoom(roomId);
    room.set(socket.id, { socketId: socket.id, username: socket.user.username, isMuted: false });

    const participants = [...room.values()].filter((p) => p.socketId !== socket.id);
    socket.emit('voice:participants', { participants });
    socket.to(roomId).emit('voice:user-joined', { socketId: socket.id, username: socket.user.username, isMuted: false });
  });

  // Voice leave
  socket.on('voice:leave', () => {
    removeVoiceParticipant(io, socket);
  });

  socket.on('room:leave', () => {
    removeVoiceParticipant(io, socket);
  });

  socket.on('disconnect', () => {
    removeVoiceParticipant(io, socket);
  });
};

module.exports = webrtcHandler;
