const express = require("express");

const roomController = require("../controllers/roomController");
const { ensureUsername, ensureRoomIdParam } = require("../middleware/validateRequest");

const router = express.Router();

router.post("/", ensureUsername, roomController.createRoom);
router.post("/:roomId/join", ensureRoomIdParam, ensureUsername, roomController.joinRoom);
router.get("/:roomId", ensureRoomIdParam, roomController.getRoomState);

module.exports = router;
