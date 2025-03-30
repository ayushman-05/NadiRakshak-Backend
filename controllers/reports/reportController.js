const Report = require("../../models/reportModel");
const DraftReport = require("../../models/draftReportModel");
const User = require("../../models/userModal");
const { verifyImage } = require("../../utils/imageAuthenticity");
const { deleteFileFromFirebase } = require("../../utils/fileUpload");
const mongoose = require("mongoose");

const submitReport = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the draft
    const draft = await DraftReport.findOne({
      _id: req.params.draftId,
      userId: req.user._id,
    }).session(session);

    if (!draft) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Draft not found" });
    }

    // 2. Verify image authenticity using the image URL
    const isAuthentic = await verifyImage(null, draft.imageUrl);
    if (!isAuthentic) {
      // If not authentic, delete the uploaded image from Firebase
      await deleteFileFromFirebase(draft.imageUrl);

      // Delete the draft since it has an invalid image
      await DraftReport.findByIdAndDelete(draft._id, { session });

      await session.abortTransaction();
      session.endSession();
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
          $maxDistance: 100, // 100 meters
        },
      },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).session(session);

    if (nearbyReports.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          "You have already submitted a report within 100 meters in the last 24 hours",
      });
    }

    // 4. Validate required fields
    if (!req.body.description || !req.body.severity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message:
          "Description and severity are required in body of this submit request",
      });
    }

    // 5. Create final report
    const reportData = {
      userId: req.user._id,
      imageUrl: draft.imageUrl,
      location: draft.location,
      description: req.body.description || draft.description,
      severitySuggestion: draft.severitySuggestion,
      severity: req.body.severity || draft.severity,
      rewards: {
        submissionRewarded: true,
        approvalRewarded: false,
      },
    };

    const report = new Report(reportData);
    await report.save({ session });

    // 6. Award points for submission
    const user = await User.findById(req.user._id).session(session);
    user.points += 5;
    user.pointsHistory.push({
      points: 5,
      reason: "Reward for submitting pollution report",
      source: "report_submission",
      sourceId: report._id,
    });
    await user.save({ session });

    // 7. Delete the draft
    await DraftReport.findByIdAndDelete(draft._id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Report submitted successfully",
      report,
      pointsAwarded: 5,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Update report status (e.g., admin review)
const updateReportStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      !["InReview", "Accepted", "Rejected"].includes(status)
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Valid status is required" });
    }

    const report = await Report.findById(id).session(session);

    if (!report) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Report not found" });
    }

    // Only award approval points when switching to Resolved and not already rewarded
    let pointsAwarded = 0;
    if (status === "Accepted" && !report.rewards.approvalRewarded) {
      const user = await User.findById(report.userId).session(session);

      if (user) {
        user.points += 20;
        user.pointsHistory.push({
          points: 20,
          reason: "Reward for approved pollution report",
          source: "report_approval",
          sourceId: report._id,
        });
        await user.save({ session });
        pointsAwarded = 20;
      }

      report.rewards.approvalRewarded = true;
    }

    report.status = status;
    await report.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Report status updated successfully",
      report,
      pointsAwarded,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitReport,
  updateReportStatus,
};
