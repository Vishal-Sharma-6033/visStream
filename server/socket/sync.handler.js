const Room = require('../models/Room');
const { addMember, removeMember, getRoomMembers, isHost, getRoom, activeRooms } = require('../utils/roomUtils');

const SYNC_INTERVAL_MS = 4000;

// ── Leave helper ────────────────────────────────────────────
const handleLeave = async (socket, io) => {
  const roomId = socket.currentRoom;
  if (!roomId) return;

  const { room, newHostSocketId } = removeMember(roomId, socket.id);
  socket.leave(roomId);
  socket.currentRoom = null;

  if (newHostSocketId) {
    io.to(newHostSocketId).emit('room:host-assigned');
    io.to(roomId).emit('room:host-changed', { newHostSocketId, members: getRoomMembers(roomId) });
  } else if (room) {
    io.to(roomId).emit('room:user-left', { socketId: socket.id, username: socket.user.username, members: getRoomMembers(roomId) });
  }

  // Remove from MongoDB
  try {
    await Room.findOneAndUpdate({ roomId }, { $pull: { members: { userId: socket.user._id } } });
  } catch (e) { console.error('Leave DB update:', e.message); }
};

// ── Main handler ────────────────────────────────────────────
const syncHandler = (io, socket) => {
  const { user } = socket;

  // ── room:join ──
  socket.on('room:join', async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId }).populate('hostId', 'username avatar');
      if (!room)        return socket.emit('error', { message: 'Room not found' });
      if (!room.isActive) return socket.emit('error', { message: 'Room is closed' });

      socket.join(roomId);
      socket.currentRoom = roomId;

      const roomState   = addMember(roomId, socket.id, { userId: user._id.toString(), username: user.username, avatar: user.avatar, isMuted: false, isBuffering: false });
      const userIsHost  = roomState.hostSocketId === socket.id;

      // Persist member if new
      if (!room.members.find(m => m.userId?.toString() === user._id.toString())) {
        room.members.push({ userId: user._id, username: user.username, avatar: user.avatar });
        await room.save();
      }

      socket.emit('room:joined', {
        roomId,
        isHost: userIsHost,
        playbackState: room.playbackState,
        members: getRoomMembers(roomId),
        messages: room.messages.slice(-50),
        videoUrl: room.videoUrl,
        videoId:  room.videoId,
      });

      socket.to(roomId).emit('room:user-joined', { userId: user._id, username: user.username, avatar: user.avatar, socketId: socket.id, members: getRoomMembers(roomId) });

      // Request host time to sync new arrival
      if (!userIsHost && roomState.hostSocketId) {
        io.to(roomState.hostSocketId).emit('sync:ping', { targetSocketId: socket.id });
      }

      // Start drift-correction ticker for this room (host starts it)
      if (userIsHost) {
        const existing = activeRooms.get(roomId);
        if (existing && !existing.syncInterval) {
          existing.syncInterval = setInterval(() => {
            const r = getRoom(roomId);
            if (!r || r.members.size <= 1) return;
            if (r.hostSocketId) io.to(r.hostSocketId).emit('sync:ping', { targetSocketId: 'all' });
          }, SYNC_INTERVAL_MS);
        }
      }
    } catch (err) {
      console.error('room:join error:', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ── room:leave ──
  socket.on('room:leave', () => handleLeave(socket, io));
  socket.on('disconnect', () => handleLeave(socket, io));

  // ── sync:pong  (host replies with current playback time) ──
  socket.on('sync:pong', ({ currentTime, playing, targetSocketId }) => {
    const roomId = socket.currentRoom;
    if (!roomId || !isHost(roomId, socket.id)) return;

    const payload = { currentTime, playing, serverTime: Date.now() };
    if (targetSocketId === 'all') socket.to(roomId).emit('sync:correct', payload);
    else io.to(targetSocketId).emit('sync:correct', payload);
  });

  // ── video controls (any user) ──
  socket.on('video:play', async ({ currentTime }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    socket.to(roomId).emit('video:play', { currentTime });
    await Room.findOneAndUpdate({ roomId }, { 'playbackState.playing': true, 'playbackState.currentTime': currentTime, 'playbackState.updatedAt': new Date() });
  });

  socket.on('video:pause', async ({ currentTime }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    socket.to(roomId).emit('video:pause', { currentTime });
    await Room.findOneAndUpdate({ roomId }, { 'playbackState.playing': false, 'playbackState.currentTime': currentTime, 'playbackState.updatedAt': new Date() });
  });

  socket.on('video:seek', async ({ currentTime }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    socket.to(roomId).emit('video:seek', { currentTime });
    await Room.findOneAndUpdate({ roomId }, { 'playbackState.currentTime': currentTime, 'playbackState.updatedAt': new Date() });
  });

  // ── buffer state (any user) ──
  socket.on('video:buffer', ({ isBuffering }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    const room = getRoom(roomId);
    if (!room) return;
    const member = room.members.get(socket.id);
    if (member) member.isBuffering = isBuffering;

    socket.to(roomId).emit('video:buffer', { socketId: socket.id, username: user.username, isBuffering });

    // Only host buffering should pause/resume everyone.
    // Guest-side network hiccups should not stall the room globally.
    const senderIsHost = isHost(roomId, socket.id);

    if (senderIsHost) {
      if (isBuffering) {
        socket.to(roomId).emit('video:pause', { currentTime: null });
        io.to(roomId).emit('sync:stalled', { username: user.username, isBuffering: true });
      } else {
        io.to(roomId).emit('video:play', { currentTime: null });
        io.to(roomId).emit('sync:stalled', { isBuffering: false });
      }
      return;
    }

    // For guest buffering, only clear stale stalled overlays if host is healthy.
    const hostIsBuffering = room.hostSocketId ? room.members.get(room.hostSocketId)?.isBuffering : false;
    if (!hostIsBuffering) {
      io.to(roomId).emit('sync:stalled', { isBuffering: false });
    }
  });

  // ── host changes video ──
  socket.on('video:change', async ({ videoUrl, videoId }) => {
    const roomId = socket.currentRoom;
    if (!roomId || !isHost(roomId, socket.id)) return;
    io.to(roomId).emit('video:change', { videoUrl, videoId });
    await Room.findOneAndUpdate({ roomId }, { videoUrl, videoId: videoId || null, 'playbackState.playing': false, 'playbackState.currentTime': 0 });
  });
};

module.exports = syncHandler;
