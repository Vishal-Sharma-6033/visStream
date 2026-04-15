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
  const allowedMime = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska',
    'video/x-m4v',
    'video/3gpp',
    'video/ogg',
  ];
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExt = new Set(['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.mpeg', '.mpg', '.3gp', '.ogv']);

  const isVideoMime = typeof file.mimetype === 'string' && file.mimetype.startsWith('video/');
  const mimeAllowed = allowedMime.includes(file.mimetype) || isVideoMime;
  const extAllowed = allowedExt.has(ext);
  const ok = mimeAllowed || extAllowed;

  cb(ok ? null : new Error('Only video files are allowed'), ok);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2 GB

module.exports = upload;
