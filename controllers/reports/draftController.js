const DraftReport = require("../../models/draftReportModel");
const { uploadFileToFirebase,deleteFileFromFirebase } = require("../../utils/fileUpload");
const { verifyImage } = require("../../utils/imageAuthenticity");
//const { analyzeSeverity } = require("../../utils/severityAnalyzer");
//const { extractLocationFromExif } = require("../../utils/locationExtractor");

const createDraftReport = async (req, res) => {
  try {
    // Verify image is provided
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    // 1. Extract location from EXIF data first
    //let location = await extractLocationFromExif(req.file.buffer);

    // If no location in EXIF, use user-provided location if available
    if (req.body.latitude && req.body.longitude) {
      location = {
        type: "Point",
        coordinates: [
          parseFloat(req.body.longitude),
          parseFloat(req.body.latitude),
        ],
      };
    } else if (!location) {
      return res.status(400).json({
        message: "Location data not found in image and not provided manually",
      });
    }

    // 2. Upload image to Firebase first
    const imageUrl = await uploadFileToFirebase(req.file, "pollution-reports");

    // 3. Verify image authenticity using the uploaded URL
    const isAuthentic = await verifyImage(null, imageUrl);
    if (!isAuthentic) {
      // If not authentic, delete the uploaded image from Firebase
      await deleteFileFromFirebase(imageUrl);

      return res.status(400).json({
        message:
          "Image appears to be AI-generated or manipulated. Please submit an authentic photo.",
      });
    }

    // 4. Analyze severity using AI
    const severitySuggestion = await "Medium";

    // 5. Create draft report
    const draftReport = new DraftReport({
      userId: req.user._id, // Assuming user is authenticated
      imageUrl,
      location,
      description: req.body.description || "",
      severity: req.body.severity || severitySuggestion,
    });

    await draftReport.save();

    res.status(201).json({
      message: "Draft report created successfully",
      draftReport,
    });
  } catch (error) {
    console.error("Error creating draft report:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createDraftReport };
