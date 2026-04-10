const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const uploadDir = path.join(__dirname, '..', process.env.VIDEOS_DIR || 'uploads/videos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
  cb(allowed.includes(file.mimetype) ? null : new Error('Only video files are allowed'), allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2 GB

module.exports = upload;
