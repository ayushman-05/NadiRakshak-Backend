// utils/imageAuthenticity.js
const axios = require("axios");

const verifyImage = async (imageBuffer, imageUrl = null) => {
  try {
    // If we have a direct imageUrl (from Firebase)
    if (imageUrl) {
      // Use SightEngine API to check if the image is AI-generated
      const response = await axios.get(
        "https://api.sightengine.com/1.0/check.json",
        {
          params: {
            models: "genai",
            api_user: process.env.SIGHTENGINE_API_USER,
            api_secret: process.env.SIGHTENGINE_API_SECRET,
            url: imageUrl,
          },
        }
      );

      // Check the SightEngine response
        // If probability of being AI-generated is high, reject the image
      if (response.data.type.ai_generated > 0.7) {
        return false;
      }

      return true;
    }
    // If we have the image buffer but no URL yet (pre-upload verification)
    else if (imageBuffer) {
      // In this case, we need to use the SightEngine API for binary upload
      // Create FormData for the binary upload
      const formData = new FormData();
      formData.append("models", "genai");
      formData.append("api_user", process.env.SIGHTENGINE_API_USER);
      formData.append("api_secret", process.env.SIGHTENGINE_API_SECRET);
      formData.append("media", new Blob([imageBuffer]), "image.jpg");

      const response = await axios.post(
        "https://api.sightengine.com/1.0/check.json",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Check the SightEngine response
      console.log(response.data);
      if (response.data && response.data.genai) {
        // If probability of being AI-generated is high, reject the image
        if (response.data.genai.prob > 0.7) {
          return false;
        }
      }

      return true;
    }

    // If neither URL nor buffer is provided
    return false;
  } catch (error) {
    console.error("Error verifying image with SightEngine:", error);
    // In case of API error, you might want to:
    // 1. Log the error
    // 2. Return false to be safe (reject the image)
    // OR
    // 3. Return true to avoid blocking legitimate uploads due to API issues
    return false; // Rejecting by default to be safe
  }
};

module.exports = { verifyImage };
