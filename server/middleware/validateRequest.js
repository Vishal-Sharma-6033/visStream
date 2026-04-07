const ApiError = require("../utils/ApiError");

function ensureUsername(req, _res, next) {
  const username = req.body?.username?.trim();

  if (!username) {
    return next(new ApiError(400, "username is required"));
  }

  if (username.length < 2 || username.length > 32) {
    return next(new ApiError(400, "username must be between 2 and 32 characters"));
  }

  req.body.username = username;
  return next();
}

function ensureRoomIdParam(req, _res, next) {
  const roomId = req.params?.roomId?.trim()?.toUpperCase();

  if (!roomId) {
    return next(new ApiError(400, "roomId is required"));
  }

  if (!/^[A-Z0-9_-]{4,16}$/.test(roomId)) {
    return next(new ApiError(400, "Invalid roomId format"));
  }

  req.params.roomId = roomId;
  return next();
}

module.exports = {
  ensureUsername,
  ensureRoomIdParam
};
