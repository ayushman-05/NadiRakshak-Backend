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
// utils/fileUpload.js
// Add this function to the existing file

/**
 * Deletes a file from Firebase Storage
 * @param {String} fileUrl - The URL of the file to delete
 * @returns {Promise<Boolean>} True if deletion was successful
 */
const deleteFileFromFirebase = async (fileUrl) => {
  try {
    // Extract the file path from the URL
    const urlParts = fileUrl.split('?')[0].split('/');
    const fileName = urlParts[urlParts.length - 1];
    const decodedFileName = decodeURIComponent(fileName);
    
    // Find the folder path in the URL
    let filePath = '';
    for (let i = 0; i < urlParts.length; i++) {
      if (urlParts[i] === 'o') {
        filePath = urlParts[i + 1];
        break;
      }
    }
    
    if (!filePath) {
      throw new Error('Could not determine file path from URL');
    }
    
    // Create a reference to the file
    const fileRef = bucket.file(filePath);
    
    // Delete the file
    await fileRef.delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting file from Firebase:', error);
    return false;
  }
};

module.exports = { uploadFileToFirebase, deleteFileFromFirebase };
//module.exports = { uploadFileToFirebase };
