// controllers/campaigns/creatorCampaign.js
const Campaign = require("../../models/campaignModel");
const User = require("../../models/userModal");
const mongoose = require("mongoose");
const { sanitize } = require("express-mongo-sanitize");
const { uploadFileToFirebase } = require("../../utils/fileUpload");

// Helper to sanitize input data
const sanitizeData = (data) => {
  // Use express-mongo-sanitize to prevent NoSQL injection
  const sanitized = sanitize(data);
  // Additional sanitization for strings (basic XSS prevention)
  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitized[key]
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
  }

  return sanitized;
};

// Create a new campaign
const createCampaign = async (req, res) => {
  try {
    // Count user's active campaigns (not finished)
    const activeCampaignsCount = await Campaign.countDocuments({
      creator: req.user._id,
      status: { $ne: "finished" },
    });

    if (activeCampaignsCount >= 3) {
      return res.status(400).json({
        status: "fail",
        message: "You cannot create more than 3 active or upcoming campaigns",
      });
    }

    // Sanitize input data
    const sanitizedData = sanitizeData(req.body);

    // Handle image upload if a file was provided
    let imageUrl = "default-campaign.jpg";
    if (req.file) {
      try {
        imageUrl = await uploadFileToFirebase(req.file, "campaigns");
      } catch (uploadError) {
        return res.status(400).json({
          status: "fail",
          message: `Image upload failed: ${uploadError}`,
        });
      }
    }

    // Create new campaign with image URL
    const campaign = await Campaign.create({
      ...sanitizedData,
      creator: req.user._id,
      image: imageUrl,
    });

    res.status(201).json({
      status: "success",
      data: {
        campaign,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Update campaign
const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: "fail",
        message: "Campaign not found",
      });
    }

    // Check if user is the creator
    if (!campaign.creator.equals(req.user._id)) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to update this campaign",
      });
    }

    // Prevent updating finished campaigns
    if (campaign.status === "finished") {
      return res.status(400).json({
        status: "fail",
        message: "Cannot update a finished campaign",
      });
    }

    // Sanitize input data
    const sanitizedData = sanitizeData(req.body);

    // Prevent reducing maxParticipants below current participant count
    if (
      sanitizedData.maxParticipants &&
      sanitizedData.maxParticipants < campaign.participants.length
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "Cannot reduce maximum participants below current participant count",
      });
    }

    // Handle image upload if a new image was provided
    if (req.file) {
      try {
        sanitizedData.image = await uploadFileToFirebase(req.file, "campaigns");
      } catch (uploadError) {
        return res.status(400).json({
          status: "fail",
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      sanitizedData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: "success",
      data: {
        campaign: updatedCampaign,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Delete campaign (existing code remains unchanged)
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        status: "fail",
        message: "Campaign not found",
      });
    }

    // Check if user is the creator
    if (!campaign.creator.equals(req.user._id)) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this campaign",
      });
    }

    // Only allow deleting upcoming campaigns
    if (campaign.status !== "upcoming") {
      return res.status(400).json({
        status: "fail",
        message: "Can only delete upcoming campaigns",
      });
    }

    // Start a session to handle the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // If there are participants, remove the campaign from their participatedCampaigns
      if (campaign.participants.length > 0) {
        // Get array of participant user IDs
        const participantIds = campaign.participants.map((p) => p.user);

        // Update all participants to remove this campaign from their participatedCampaigns array
        await User.updateMany(
          { _id: { $in: participantIds } },
          { $pull: { participatedCampaigns: campaign._id } },
          { session }
        );
      }

      // Delete the campaign
      await Campaign.findByIdAndDelete(req.params.id, { session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (error) {
      // If an error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  deleteCampaign,
  updateCampaign,
  createCampaign,
};
