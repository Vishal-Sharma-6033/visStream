const { verifySocketToken } = require('../middleware/auth.middleware');
const syncHandler   = require('./sync.handler');
const chatHandler   = require('./chat.handler');
const webrtcHandler = require('./webrtc.handler');

const initializeSocket = (io) => {
  // ── Auth middleware ──────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('AUTH_REQUIRED'));
    try {
      socket.user = await verifySocketToken(token);
      if (!socket.user) return next(new Error('USER_NOT_FOUND'));
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌  ${socket.user.username} connected  [${socket.id}]`);

    syncHandler(io, socket);
    chatHandler(io, socket);
    webrtcHandler(io, socket);

    socket.on('error',      (err) => console.error(`Socket error [${socket.user.username}]:`, err.message));
    socket.on('disconnect', (reason) => console.log(`❌  ${socket.user.username} disconnected — ${reason}`));
  });
};

module.exports = initializeSocket;
