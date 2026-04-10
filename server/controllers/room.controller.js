const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');

// POST /api/rooms
const createRoom = async (req, res) => {
  try {
    const { name, videoUrl, isPrivate } = req.body;
    if (!name) return res.status(400).json({ message: 'Room name is required' });

    const roomId = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const room = await Room.create({
      roomId,
      name: name.trim(),
      hostId: req.user._id,
      videoUrl: videoUrl || null,
      isPrivate: !!isPrivate,
    });

    await room.populate('hostId', 'username avatar');
    res.status(201).json({ room });
  } catch (err) {
    console.error('createRoom:', err);
    res.status(500).json({ message: 'Could not create room' });
  }
};

// GET /api/rooms/:id
const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.id })
      .populate('hostId', 'username avatar')
      .populate('videoId');
    if (!room)     return res.status(404).json({ message: 'Room not found' });
    if (!room.isActive) return res.status(410).json({ message: 'Room is closed' });
    res.json({ room });
  } catch (err) {
    console.error('getRoom:', err);
    res.status(500).json({ message: 'Could not fetch room' });
  }
};

// DELETE /api/rooms/:id
const closeRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.id });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.hostId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the host can close the room' });
    room.isActive = false;
    await room.save();
    res.json({ message: 'Room closed' });
  } catch (err) {
    console.error('closeRoom:', err);
    res.status(500).json({ message: 'Could not close room' });
  }
};

// PATCH /api/rooms/:id/video
const updateRoomVideo = async (req, res) => {
  try {
    const { videoUrl, videoId } = req.body;
    const room = await Room.findOne({ roomId: req.params.id });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.hostId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the host can change the video' });

    if (videoUrl) room.videoUrl = videoUrl;
    if (videoId)  room.videoId  = videoId;
    room.playbackState = { playing: false, currentTime: 0, updatedAt: new Date() };
    await room.save();
    res.json({ room });
  } catch (err) {
    console.error('updateRoomVideo:', err);
    res.status(500).json({ message: 'Could not update video' });
  }
};

module.exports = { createRoom, getRoom, closeRoom, updateRoomVideo };
