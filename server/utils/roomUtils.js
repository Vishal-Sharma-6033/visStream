/**
 * In-memory room state store.
 * Augments MongoDB with fast, per-connection runtime data.
 */
const activeRooms = new Map(); // roomId → RoomState

const initRoom = (roomId) => {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, {
      roomId,
      members: new Map(), // socketId → MemberData
      hostSocketId: null,
      syncInterval: null,
    });
  }
  return activeRooms.get(roomId);
};

const getRoom = (roomId) => activeRooms.get(roomId) || null;

const addMember = (roomId, socketId, memberData) => {
  const room = initRoom(roomId);
  room.members.set(socketId, { ...memberData, socketId });
  if (!room.hostSocketId) room.hostSocketId = socketId;
  return room;
};

const removeMember = (roomId, socketId) => {
  const room = activeRooms.get(roomId);
  if (!room) return { room: null, newHostSocketId: null };

  room.members.delete(socketId);

  // Reassign host if needed
  let newHostSocketId = null;
  if (room.hostSocketId === socketId) {
    if (room.members.size > 0) {
      newHostSocketId = [...room.members.keys()][0];
      room.hostSocketId = newHostSocketId;
    } else {
      // Empty room — clean up
      if (room.syncInterval) clearInterval(room.syncInterval);
      activeRooms.delete(roomId);
      return { room: null, newHostSocketId: null };
    }
  }

  return { room, newHostSocketId };
};

const getRoomMembers = (roomId) => {
  const room = activeRooms.get(roomId);
  return room ? [...room.members.values()] : [];
};

const isHost = (roomId, socketId) => {
  const room = activeRooms.get(roomId);
  return room?.hostSocketId === socketId;
};

module.exports = { initRoom, getRoom, addMember, removeMember, getRoomMembers, isHost, activeRooms };
