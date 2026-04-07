class RoomService {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.socketToUsername = new Map();
  }

  ensureRoom(roomDoc) {
    const roomId = roomDoc.roomId;
    const existing = this.rooms.get(roomId);

    const currentSocketIds = [];
    if (existing) {
      for (const socketId of existing.users.keys()) {
        currentSocketIds.push(socketId);
      }
    }

    for (const socketId of currentSocketIds) {
      this.socketToRoom.delete(socketId);
      this.socketToUsername.delete(socketId);
    }

    const usersMap = new Map();
    for (const user of roomDoc.users) {
      if (user.socketId) {
        usersMap.set(user.socketId, { username: user.username });
        this.socketToRoom.set(user.socketId, roomId);
        this.socketToUsername.set(user.socketId, user.username);
      }
    }

    const nextRoom = {
      roomId,
      host: roomDoc.host,
      isPlaying: roomDoc.isPlaying,
      currentTime: roomDoc.currentTime,
      users: usersMap
    };

    this.rooms.set(roomId, nextRoom);

    return nextRoom;
  }

  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  addUser(roomId, socketId, username) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { ok: false, reason: "ROOM_NOT_LOADED" };
    }

    let replacedSocketId = null;

    for (const [existingSocketId, existingUser] of room.users.entries()) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        replacedSocketId = existingSocketId;
        room.users.delete(existingSocketId);
        this.socketToRoom.delete(existingSocketId);
        this.socketToUsername.delete(existingSocketId);
        break;
      }
    }

    room.users.set(socketId, { username });
    this.socketToRoom.set(socketId, roomId);
    this.socketToUsername.set(socketId, username);

    return { ok: true, replacedSocketId };
  }

  removeSocket(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);
    const username = this.socketToUsername.get(socketId);

    this.socketToRoom.delete(socketId);
    this.socketToUsername.delete(socketId);

    if (!room) {
      return { roomId, username, hostChanged: false, newHost: null, roomEmptied: true };
    }

    room.users.delete(socketId);

    let hostChanged = false;
    if (room.host === username) {
      const firstRemaining = room.users.values().next().value;
      room.host = firstRemaining?.username || null;
      hostChanged = true;
    }

    const roomEmptied = room.users.size === 0;
    if (roomEmptied) {
      room.isPlaying = false;
      room.currentTime = 0;
    }

    return {
      roomId,
      username,
      hostChanged,
      newHost: room.host,
      roomEmptied
    };
  }

  isHost(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const username = this.socketToUsername.get(socketId);
    return room.host === username;
  }

  updatePlayback(roomId, payload) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    if (typeof payload.currentTime === "number" && Number.isFinite(payload.currentTime)) {
      room.currentTime = Math.max(0, payload.currentTime);
    }

    if (typeof payload.isPlaying === "boolean") {
      room.isPlaying = payload.isPlaying;
    }

    return this.getPublicState(roomId);
  }

  getPublicState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    return {
      roomId,
      host: room.host,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      users: [...room.users.entries()].map(([socketId, user]) => ({
        socketId,
        username: user.username
      }))
    };
  }
}

module.exports = new RoomService();
