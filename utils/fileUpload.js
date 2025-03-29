// utils/fileUpload.js
const { bucket } = require("./firebaseConfig");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

/**
 * Uploads a file to Firebase Storage
 * @param {Object} file - Express file object (from multer)
 * @param {String} folder - Folder path within bucket (e.g., 'campaigns')
 * @returns {Promise<String>} Public URL of the uploaded file
 */
const uploadFileToFirebase = async (file, folder = "campaigns") => {
  try {
    // Create a unique filename to prevent overwriting
    const fileName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;

    // Create a file reference
    const fileUpload = bucket.file(fileName);

    // Create a token to make the file publicly accessible
    const uuid = uuidv4();

    // Create write stream for uploading
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: uuid,
        },
      },
    });

    // Return a promise that resolves with the file URL
    return new Promise((resolve, reject) => {
      blobStream.on("error", (error) => {
        reject(error);
      });

      blobStream.on("finish", () => {
        // Construct the file URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
          bucket.name
        }/o/${encodeURIComponent(fileName)}?alt=media&token=${uuid}`;

        resolve(publicUrl);
      });

      // Start the upload
      blobStream.end(file.buffer);
    });
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

module.exports = { uploadFileToFirebase };
