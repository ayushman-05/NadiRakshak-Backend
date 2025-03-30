const Report = require("../../models/reportModel");
const DraftReport = require("../../models/draftReportModel");
const { verifyImage } = require("../../utils/imageAuthenticity");
const { deleteFileFromFirebase } = require("../../utils/fileUpload");

const submitReport = async (req, res) => {
  try {
    // 1. Find the draft
    const draft = await DraftReport.findOne({
      _id: req.params.draftId,
      userId: req.user._id,
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    // 2. Verify image authenticity using the image URL
    const isAuthentic = await verifyImage(null, draft.imageUrl);
    if (!isAuthentic) {
      // If not authentic, delete the uploaded image from Firebase
      await deleteFileFromFirebase(draft.imageUrl);

      // Delete the draft since it has an invalid image
      await DraftReport.findByIdAndDelete(draft._id);

      return res.status(400).json({
        message:
          "Image appears to be AI-generated or manipulated. Please submit an authentic photo.",
      });
    }

    // 3. Check if user has submitted a report nearby in the last 24 hours
    const nearbyReports = await Report.find({
      userId: req.user._id,
      location: {
        $near: {
          $geometry: draft.location,
          $maxDistance: 200, // 200 meters
        },
      },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (nearbyReports.length > 0) {
      return res.status(400).json({
        message:
          "You have already submitted a report within 200 meters in the last 24 hours",
      });
    }

    // 4. Validate required fields
    if (!draft.description || !req.body.severity) {
      return res.status(400).json({
        message: "Description and severity are required",
      });
    }

    //console.log(draft);

    // 5. Create final report
    const reportData = {
      userId: req.user._id,
      imageUrl: draft.imageUrl,
      location: draft.location,
      description: req.body.description || draft.description,
      severitySuggestion: draft.severitySuggestion,
      severity: req.body.severity || draft.severity,
    };

    const report = new Report(reportData);
    await report.save();

    // 6. Delete the draft
    await DraftReport.findByIdAndDelete(draft._id);

    res.status(201).json({
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitReport };
