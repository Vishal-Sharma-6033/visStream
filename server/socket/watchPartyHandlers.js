const Room = require("../models/Room");
const ChatMessage = require("../models/ChatMessage");
const roomService = require("../services/roomService");
const { pickDefaultStreamKey } = require("../services/hlsService");

function isValidRoomPayload(payload) {
  return payload && typeof payload.roomId === "string" && payload.roomId.trim().length > 0;
}

function normalizeRoomId(roomId) {
  return roomId.trim().toUpperCase();
}

async function handlePlaybackAction({
  io,
  socket,
  payload,
  callback,
  forceIsPlaying,
  allowSeekOnly = false,
  eventNames
}) {
  if (!isValidRoomPayload(payload)) {
    callback({ ok: false, error: "Invalid payload" });
    return;
  }

  const roomId = normalizeRoomId(payload.roomId);

  if (!roomService.isHost(roomId, socket.id)) {
    callback({ ok: false, error: "Only host can control playback" });
    return;
  }

  const currentTime = Number(payload.currentTime);
  if (!Number.isFinite(currentTime) || currentTime < 0) {
    callback({ ok: false, error: "Invalid currentTime" });
    return;
  }

  const patch = { currentTime };
  if (!allowSeekOnly && typeof forceIsPlaying === "boolean") {
    patch.isPlaying = forceIsPlaying;
  }

  const state = roomService.updatePlayback(roomId, patch);
  if (!state) {
    callback({ ok: false, error: "Room state unavailable" });
    return;
  }

  const dbPatch = { currentTime: state.currentTime };
  if (!allowSeekOnly && typeof forceIsPlaying === "boolean") {
    dbPatch.isPlaying = forceIsPlaying;
  }

  await Room.updateOne(
    { roomId },
    {
      $set: dbPatch
    }
  );

  const outbound = {
    roomId,
    currentTime: state.currentTime,
    isPlaying: state.isPlaying,
    timestamp: new Date().toISOString()
  };

  for (const eventName of eventNames) {
    socket.to(roomId).emit(eventName, outbound);
  }

  callback({ ok: true, state });
}

function registerWatchPartyHandlers(io, socket) {
  socket.on("room:join", async (payload, callback = () => {}) => {
    try {
      if (!isValidRoomPayload(payload) || typeof payload.username !== "string") {
        callback({ ok: false, error: "Invalid join payload" });
        return;
      }

      const roomId = normalizeRoomId(payload.roomId);
      const username = payload.username.trim();

      if (!username) {
        callback({ ok: false, error: "username is required" });
        return;
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        callback({ ok: false, error: "Room not found" });
        return;
      }

      const wasEmptyRoom = room.users.length === 0;

      if (!room.streamKey) {
        const fallbackStreamKey = pickDefaultStreamKey();
        if (!fallbackStreamKey) {
          callback({ ok: false, error: "No HLS playlist found in public/hls" });
          return;
        }
        room.streamKey = fallbackStreamKey;
      }

      const existingUser = room.users.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );

      const previousSocketId = existingUser?.socketId || null;

      if (!existingUser) {
        room.users.push({ username, socketId: socket.id });
      }

      if (existingUser) {
        existingUser.socketId = socket.id;
      }

      if (wasEmptyRoom || !room.host) {
        room.host = username;
      }

      await room.save();

      roomService.ensureRoom(room);

      const addResult = roomService.addUser(roomId, socket.id, username);
      if (!addResult?.ok) {
        callback({ ok: false, error: "Duplicate username in room" });
        return;
      }

      socket.join(roomId);

      if (previousSocketId && previousSocketId !== socket.id) {
        const staleSocket = io.sockets.sockets.get(previousSocketId);
        if (staleSocket) {
          staleSocket.leave(roomId);
        }
      }

      io.to(roomId).emit("room:state", roomService.getPublicState(roomId));
      socket.to(roomId).emit("room:user-joined", {
        roomId,
        username,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      callback({ ok: true, state: roomService.getPublicState(roomId) });
    } catch (error) {
      callback({ ok: false, error: "Failed to join room" });
    }
  });

  const onPlay = async (payload, callback = () => {}) => {
    await handlePlaybackAction({
      io,
      socket,
      payload,
      callback,
      forceIsPlaying: true,
      eventNames: ["play", "sync:play"]
    });
  };

  const onPause = async (payload, callback = () => {}) => {
    await handlePlaybackAction({
      io,
      socket,
      payload,
      callback,
      forceIsPlaying: false,
      eventNames: ["pause", "sync:pause"]
    });
  };

  const onSeek = async (payload, callback = () => {}) => {
    await handlePlaybackAction({
      io,
      socket,
      payload,
      callback,
      allowSeekOnly: true,
      eventNames: ["seek", "sync:seek"]
    });
  };

  socket.on("play", onPlay);
  socket.on("sync:play", onPlay);
  socket.on("pause", onPause);
  socket.on("sync:pause", onPause);
  socket.on("seek", onSeek);
  socket.on("sync:seek", onSeek);

  socket.on("sync", async (payload, callback = () => {}) => {
    await handlePlaybackAction({
      io,
      socket,
      payload,
      callback,
      forceIsPlaying: typeof payload?.isPlaying === "boolean" ? payload.isPlaying : undefined,
      allowSeekOnly: typeof payload?.isPlaying !== "boolean",
      eventNames: ["sync"]
    });
  });

  socket.on("sync:request", (payload, callback = () => {}) => {
    if (!isValidRoomPayload(payload)) {
      callback({ ok: false, error: "Invalid payload" });
      return;
    }

    const roomId = normalizeRoomId(payload.roomId);
    const state = roomService.getPublicState(roomId);

    if (!state) {
      callback({ ok: false, error: "Room state unavailable" });
      return;
    }

    callback({ ok: true, state });
  });

  socket.on("chat:message", async (payload, callback = () => {}) => {
    try {
      if (
        !payload ||
        typeof payload.roomId !== "string" ||
        typeof payload.username !== "string" ||
        typeof payload.message !== "string"
      ) {
        callback({ ok: false, error: "Invalid message payload" });
        return;
      }

      const roomId = normalizeRoomId(payload.roomId);
      const username = payload.username.trim();
      const message = payload.message.trim();

      if (!username || !message) {
        callback({ ok: false, error: "username and message are required" });
        return;
      }

      if (message.length > 500) {
        callback({ ok: false, error: "Message exceeds 500 characters" });
        return;
      }

      const chatMessage = await ChatMessage.create({
        roomId,
        username,
        message
      });

      const outbound = {
        id: chatMessage._id.toString(),
        roomId,
        username,
        message,
        timestamp: chatMessage.createdAt
      };

      io.to(roomId).emit("chat:message", outbound);
      callback({ ok: true, message: outbound });
    } catch (_error) {
      callback({ ok: false, error: "Failed to store message" });
    }
  });

  socket.on("disconnect", async () => {
    const removal = roomService.removeSocket(socket.id);

    if (!removal) {
      return;
    }

    const { roomId, username, hostChanged, newHost, roomEmptied } = removal;

    if (roomEmptied) {
      await Room.updateOne(
        { roomId },
        {
          $pull: { users: { socketId: socket.id } },
          $set: { isPlaying: false, currentTime: 0 }
        }
      );
      return;
    }

    await Room.updateOne(
      { roomId },
      {
        $pull: { users: { socketId: socket.id } },
        $set: { host: newHost }
      }
    );

    socket.to(roomId).emit("room:user-left", {
      roomId,
      username,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    if (hostChanged) {
      io.to(roomId).emit("room:host-changed", {
        roomId,
        host: newHost
      });
    }

    io.to(roomId).emit("room:state", roomService.getPublicState(roomId));
  });
}

module.exports = registerWatchPartyHandlers;
