const crypto = require("crypto");

const Room = require("../models/Room");
const roomService = require("../services/roomService");
const { pickDefaultStreamKey } = require("../services/hlsService");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function generateRoomId() {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

const createRoom = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const streamKey = pickDefaultStreamKey();

  if (!streamKey) {
    throw new ApiError(400, "No HLS playlist found. Put at least one .m3u8 file in public/hls");
  }

  let roomId = generateRoomId();
  let roomExists = await Room.exists({ roomId });

  while (roomExists) {
    roomId = generateRoomId();
    roomExists = await Room.exists({ roomId });
  }

  const room = await Room.create({
    roomId,
    host: username,
    streamKey,
    users: [{ username, socketId: null }],
    isPlaying: false,
    currentTime: 0
  });

  roomService.ensureRoom(room);

  res.status(201).json({
    roomId: room.roomId,
    host: room.host,
    streamKey: room.streamKey,
    users: room.users,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime
  });
});

const joinRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { username } = req.body;

  const room = await Room.findOne({ roomId });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  if (!room.streamKey) {
    const fallbackStreamKey = pickDefaultStreamKey();
    if (!fallbackStreamKey) {
      throw new ApiError(400, "No HLS playlist found. Put at least one .m3u8 file in public/hls");
    }
    room.streamKey = fallbackStreamKey;
  }

  const wasEmptyRoom = room.users.length === 0;
  const hostMissingBeforeJoin = !room.host;

  const existingUser = room.users.find(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );

  if (!existingUser) {
    room.users.push({ username, socketId: null });
  }

  if (wasEmptyRoom || hostMissingBeforeJoin) {
    room.host = username;
  }

  if (!existingUser || wasEmptyRoom || hostMissingBeforeJoin) {
    await room.save();
  }

  roomService.ensureRoom(room);

  res.status(200).json({
    roomId: room.roomId,
    host: room.host,
    streamKey: room.streamKey,
    users: room.users,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime
  });
});

const getRoomState = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findOne({ roomId }).lean();

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  res.status(200).json({
    roomId: room.roomId,
    host: room.host,
    streamKey: room.streamKey,
    users: room.users,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime
  });
});

module.exports = {
  createRoom,
  joinRoom,
  getRoomState
};
