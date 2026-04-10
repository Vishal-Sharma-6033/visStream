const Video = require('../models/Video');
const { transcodeToHLS } = require('../services/ffmpeg.service');

// POST /api/videos/upload
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file provided' });

    const { title, description } = req.body;
    const video = await Video.create({
      title: title || req.file.originalname,
      description: description || '',
      originalFile: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing',
      uploadedBy: req.user._id,
    });

    const io = req.app.get('io');
    transcodeToHLS(video._id, req.file.path, io).catch(console.error);

    res.status(201).json({ video, message: 'Upload received — transcoding in progress' });
  } catch (err) {
    console.error('uploadVideo:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};

// POST /api/videos/external  (add an external HLS URL)
const addExternalVideo = async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'title and url are required' });

    const video = await Video.create({
      title,
      externalUrl: url,
      masterPlaylist: url,
      isExternal: true,
      status: 'ready',
      uploadedBy: req.user._id,
    });
    res.status(201).json({ video });
  } catch (err) {
    console.error('addExternalVideo:', err);
    res.status(500).json({ message: 'Could not save video' });
  }
};

// GET /api/videos/my
const getUserVideos = async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch videos' });
  }
};

// GET /api/videos/:id
const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('uploadedBy', 'username');
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json({ video });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch video' });
  }
};

module.exports = { uploadVideo, addExternalVideo, getUserVideos, getVideo };
