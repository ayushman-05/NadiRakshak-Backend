// utils/locationExtractor.js
const ExifParser = require("exif-parser");

const extractLocationFromExif = async (imageBuffer) => {
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();

    // Check if GPS info exists
    if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
      return {
        type: "Point",
        coordinates: [result.tags.GPSLongitude, result.tags.GPSLatitude],
      };
    }
    return null;
  } catch (error) {
    console.error("Error extracting location from EXIF:", error);
    return null;
  }
};

module.exports = { extractLocationFromExif };
