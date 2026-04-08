const fs = require("fs");
const path = require("path");

const Room = require("../models/Room");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

function rewritePlaylistUris(content) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      // Keep HLS directives/comments and absolute URLs untouched.
      if (
        !trimmed ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("/") ||
        /^https?:\/\//i.test(trimmed)
      ) {
        return line;
      }

      return `/hls/${trimmed}`;
    })
    .join("\n");
}

const getRoomPlaylist = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findOne({ roomId }).lean();
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  const streamKey = room.streamKey || roomId;
  const playlistPath = path.join(process.cwd(), "public", "hls", `${streamKey}.m3u8`);

  if (!fs.existsSync(playlistPath)) {
    throw new ApiError(404, "HLS playlist not found for room");
  }

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const playlistRaw = fs.readFileSync(playlistPath, "utf8");
  const playlistWithAbsoluteUris = rewritePlaylistUris(playlistRaw);

  res.status(200).send(playlistWithAbsoluteUris);
});

module.exports = {
  getRoomPlaylist
};
