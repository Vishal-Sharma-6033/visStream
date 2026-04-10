const express = require('express');
const router  = express.Router();
const { createRoom, getRoom, closeRoom, updateRoomVideo } = require('../controllers/room.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/',             protect, createRoom);
router.get('/:id',           protect, getRoom);
router.delete('/:id',        protect, closeRoom);
router.patch('/:id/video',   protect, updateRoomVideo);

module.exports = router;
