const express = require('express');
const router  = express.Router();
const { uploadVideo, addExternalVideo, getUserVideos, getVideo } = require('../controllers/video.controller');
const { protect } = require('../middleware/auth.middleware');
const upload  = require('../middleware/upload.middleware');

router.post('/upload',   protect, upload.single('video'), uploadVideo);
router.post('/external', protect, addExternalVideo);
router.get('/my',        protect, getUserVideos);
router.get('/:id',       protect, getVideo);

module.exports = router;
