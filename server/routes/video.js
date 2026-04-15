const express = require('express');
const router  = express.Router();
const { uploadVideo, addExternalVideo, getUserVideos, getVideo, deleteVideo } = require('../controllers/video.controller');
const { protect } = require('../middleware/auth.middleware');
const upload  = require('../middleware/upload.middleware');

router.post('/upload',   protect, upload.single('video'), uploadVideo);
router.post('/external', protect, addExternalVideo);
router.get('/my',        protect, getUserVideos);
router.delete('/:id',    protect, deleteVideo);
router.get('/:id',       protect, getVideo);

module.exports = router;
