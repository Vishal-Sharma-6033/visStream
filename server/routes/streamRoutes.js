const express = require("express");

const { ensureRoomIdParam } = require("../middleware/validateRequest");
const streamController = require("../controllers/streamController");

const router = express.Router();

router.get("/:roomId", ensureRoomIdParam, streamController.getRoomPlaylist);

module.exports = router;
