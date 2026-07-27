const fs = require('fs');
const path = require('path');
const multer = require('multer');

const tempDirectory = path.join(__dirname, '..', 'uploads', 'video-interviews', 'temp');
fs.mkdirSync(tempDirectory, { recursive: true });

const allowedMimeTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const allowedExtensions = new Set(['.mp4', '.webm', '.mov']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.webm';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const videoUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.has(file.mimetype) || allowedExtensions.has(extension)) return cb(null, true);
    return cb(new Error('Only MP4, WebM, and MOV video files are allowed.'));
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

module.exports = videoUpload;
