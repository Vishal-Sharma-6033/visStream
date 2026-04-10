const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    originalFile: { type: String, default: null },
    hlsPath:      { type: String, default: null },
    masterPlaylist: { type: String, default: null }, // Relative URL served by Express
    thumbnail:    { type: String, default: null },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'error'],
      default: 'uploading',
    },
    duration: { type: Number, default: 0 },
    qualities: [
      {
        resolution:  String,  // '480p' | '720p' | '1080p'
        bandwidth:   Number,
        playlistUrl: String,
      },
    ],
    fileSize:    { type: Number, default: 0 },
    mimeType:    { type: String, default: 'video/mp4' },
    isExternal:  { type: Boolean, default: false },
    externalUrl: { type: String, default: null },
    uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Video', videoSchema);
