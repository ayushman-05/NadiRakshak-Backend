// middleware/fileUploadMiddleware.js
const multer = require("multer");
const AppError = require("../utils/appError");

// Configure in-memory storage (files will be in req.file.buffer)
const storage = multer.memoryStorage();

// File filtering to only allow images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError("Only image files are allowed!", 400), false);
  }
};

// Set up multer with options
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

// Export middleware for single file uploads
const uploadCampaignImage = upload.single("image");

module.exports = { uploadCampaignImage };
