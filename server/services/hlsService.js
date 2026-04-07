const fs = require("fs");
const path = require("path");

function getHlsDirectory() {
  return path.join(process.cwd(), "public", "hls");
}

function listAvailablePlaylists() {
  const hlsDir = getHlsDirectory();

  if (!fs.existsSync(hlsDir)) {
    return [];
  }

  return fs
    .readdirSync(hlsDir)
    .filter((name) => name.toLowerCase().endsWith(".m3u8"))
    .map((name) => path.basename(name, ".m3u8"));
}

function pickDefaultStreamKey() {
  const configured = process.env.DEFAULT_STREAM_KEY?.trim();
  const playlists = listAvailablePlaylists();

  if (configured && playlists.includes(configured)) {
    return configured;
  }

  return playlists[0] || null;
}

module.exports = {
  getHlsDirectory,
  listAvailablePlaylists,
  pickDefaultStreamKey
};
