const Room = require('../models/Room');

const chatHandler = (io, socket) => {
  const { user } = socket;

  // ── chat:message ──
  socket.on('chat:message', async ({ content, type = 'text' }) => {
    const roomId = socket.currentRoom;
    if (!roomId || !content?.trim()) return;

    const message = {
      userId:    user._id,
      username:  user.username,
      avatar:    user.avatar,
      content:   content.trim().substring(0, 1000),
      type,
      timestamp: new Date(),
    };

    io.to(roomId).emit('chat:message', message);

    // Persist: keep last 100 messages
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { $push: { messages: { $each: [message], $slice: -100 } } }
      );
    } catch (err) { console.error('chat persist:', err.message); }
  });

  // ── chat:typing (ephemeral) ──
  socket.on('chat:typing', ({ isTyping }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    socket.to(roomId).emit('chat:typing', { username: user.username, isTyping });
  });

  // ── chat:reaction ──
  socket.on('chat:reaction', ({ emoji }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    io.to(roomId).emit('chat:reaction', { username: user.username, emoji, id: Date.now() });
  });
};

module.exports = chatHandler;
