const mongoose = require("mongoose");

const roomUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },
    socketId: {
      type: String,
      default: null
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true
    },
    users: {
      type: [roomUserSchema],
      default: []
    },
    host: {
      type: String,
      required: true
    },
    streamKey: {
      type: String,
      required: true,
      trim: true
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    currentTime: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Room", roomSchema);
