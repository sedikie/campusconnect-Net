const multer = require("multer");

// Files are held in memory just long enough to stream them to Cloudinary
// (we never write them to disk on the server, since Render's free tier
// doesn't keep local files between restarts anyway).
const storage = multer.memoryStorage();

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 15;

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
