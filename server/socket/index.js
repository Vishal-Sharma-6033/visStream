const { Server } = require("socket.io");

const registerWatchPartyHandlers = require("./watchPartyHandlers");
const registerSignalingHandlers = require("./signalingHandlers");

function configureSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
  });

  io.on("connection", (socket) => {
    registerWatchPartyHandlers(io, socket);
    registerSignalingHandlers(io, socket);

    socket.emit("connection:ready", {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  return io;
}

module.exports = configureSocket;
