const DraftReport = require("../../models/draftReportModel");
const { uploadFileToFirebase } = require("../../utils/fileUpload");

const createDraftReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    // Check for location data
    let location;
    if (req.body.latitude && req.body.longitude) {
      location = {
        type: "Point",
        coordinates: [
          parseFloat(req.body.longitude),
          parseFloat(req.body.latitude),
        ],
      };
    } else {
      return res.status(400).json({
        message: "Location data not provided manually",
      });
    }

    // Upload image to Firebase
    const imageUrl = await uploadFileToFirebase(req.file, "pollution-reports");

    // Default severity suggestion
    const severitySuggestion = "Medium";

    // Create draft report
    const draftReport = new DraftReport({
      userId: req.user._id, // Assuming user is authenticated
      imageUrl,
      location,
      description: req.body.description || "",
      severity: req.body.severity || severitySuggestion,
      severitySuggestion: severitySuggestion,
    });

    await draftReport.save();

    res.status(201).json({
      message: "Draft report created successfully",
      draftReport,
    });
  } catch (error) {
    //console.error("Error creating draft report:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createDraftReport };
