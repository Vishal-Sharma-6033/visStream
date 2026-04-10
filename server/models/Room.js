const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username:  String,
  avatar:    String,
  content:   { type: String, required: true, maxlength: 1000 },
  type:      { type: String, enum: ['text', 'reaction', 'system'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    name:   { type: String, required: true, trim: true, maxlength: 60 },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
    videoUrl: { type: String, default: null },
    playbackState: {
      playing:     { type: Boolean, default: false },
      currentTime: { type: Number,  default: 0 },
      updatedAt:   { type: Date,    default: Date.now },
    },
    members: [
      {
        userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username:   String,
        avatar:     String,
        isMuted:    { type: Boolean, default: false },
        isBuffering:{ type: Boolean, default: false },
        joinedAt:   { type: Date, default: Date.now },
      },
    ],
    messages:   { type: [messageSchema], default: [] },
    isActive:   { type: Boolean, default: true },
    maxMembers: { type: Number,  default: 10 },
    isPrivate:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
