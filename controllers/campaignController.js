const Campaign = require("../models/campaignModel");
const User = require("../models/userModal");
const AppError = require("../utils/appError");
const transporter = require("../utils/transporterMail");
const mongoose = require("mongoose");
const { sanitize } = require("express-mongo-sanitize");

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

// Helper to send email notification
const sendParticipationEmail = async (email, campaignTitle) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Campaign Participation Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Campaign Participation Confirmed</h2>
        <p>You have successfully joined the campaign: <strong>${campaignTitle}</strong></p>
        <p>Thank you for your participation!</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
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

    // Create new campaign
    const campaign = await Campaign.create({
      ...sanitizedData,
      creator: req.user._id,
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

// Get all campaigns (with filters)
const getAllCampaigns = async (req, res) => {
  try {
    // Build query
    let query = {};

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by date range if provided
    if (req.query.startAfter) {
      query.startDate = { $gte: new Date(req.query.startAfter) };
    }

    if (req.query.endBefore) {
      query.endDate = { ...query.endDate, $lte: new Date(req.query.endBefore) };
    }

    // Filter by available spots
    if (req.query.hasAvailableSpots === "true") {
      // This requires aggregation to compare virtual field
      const campaigns = await Campaign.aggregate([
        {
          $match: query,
        },
        {
          $addFields: {
            participantsCount: { $size: "$participants" },
          },
        },
        {
          $match: {
            $expr: { $lt: ["$participantsCount", "$maxParticipants"] },
          },
        },
      ]);

      return res.status(200).json({
        status: "success",
        results: campaigns.length,
        data: {
          campaigns,
        },
      });
    }

    // Regular query without the available spots filter
    const campaigns = await Campaign.find(query);

    res.status(200).json({
      status: "success",
      results: campaigns.length,
      data: {
        campaigns,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get campaign by ID
const getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate("creator", "name email")
      .populate("participants.user", "name");

    if (!campaign) {
      return res.status(404).json({
        status: "fail",
        message: "Campaign not found",
      });
    }

    // Check if the user is the creator to determine data visibility
    const isCreator = req.user && campaign.creator._id.equals(req.user._id);

    // If not creator, remove detailed participant information
    if (!isCreator) {
      campaign.participants = campaign.participants.map((p) => ({
        ...p,
        additionalInfo: undefined,
      }));
    }

    res.status(200).json({
      status: "success",
      data: {
        campaign,
        isCreator,
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

// Delete campaign
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

    // Only allow deleting upcoming campaigns with no participants
    if (campaign.status !== "upcoming" || campaign.participants.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Can only delete upcoming campaigns with no participants",
      });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Join a campaign
const joinCampaign = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Sanitize input data
      //const sanitizedData = sanitizeData(req.body);
      const { additionalInfo } = req.user;

      // Find campaign
      const campaign = await Campaign.findById(req.params.id).session(session);

      if (!campaign) {
        throw new AppError("Campaign not found", 404);
      }

      // Check if campaign is active or upcoming
      if (campaign.status === "finished") {
        throw new AppError("Cannot join a finished campaign", 400);
      }

      // Check if campaign has available spots
      if (campaign.participants.length >= campaign.maxParticipants) {
        throw new AppError("Campaign has reached maximum participants", 400);
      }

      // Check if user already joined
      const alreadyJoined = campaign.participants.some(
        (p) => p.user.toString() === req.user._id.toString()
      );

      if (alreadyJoined) {
        throw new AppError("You have already joined this campaign", 400);
      }

      // Add user to participants
      campaign.participants.push({
        user: req.user._id,
        joinedAt: new Date(),
        additionalInfo,
      });

      await campaign.save({ session });

      // Add campaign to user's participated campaigns
      await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { participatedCampaigns: campaign._id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Send participation email
      await sendParticipationEmail(req.user.email, campaign.title);

      res.status(200).json({
        status: "success",
        message: "Successfully joined the campaign",
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    res.status(error.statusCode || 400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Leave a campaign
const leaveCampaign = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find campaign
      const campaign = await Campaign.findById(req.params.id).session(session);

      if (!campaign) {
        throw new AppError("Campaign not found", 404);
      }

      // Check if campaign is active or upcoming
      if (campaign.status === "finished") {
        throw new AppError("Cannot leave a finished campaign", 400);
      }

      // Check if user is a participant
      const participantIndex = campaign.participants.findIndex(
        (p) => p.user.toString() === req.user._id.toString()
      );

      if (participantIndex === -1) {
        throw new AppError("You are not a participant in this campaign", 400);
      }

      // Remove user from participants
      campaign.participants.splice(participantIndex, 1);
      await campaign.save({ session });

      // Remove campaign from user's participated campaigns
      await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { participatedCampaigns: campaign._id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: "success",
        message: "Successfully left the campaign",
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    res.status(error.statusCode || 400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get user's campaigns (created and joined)
const getUserCampaigns = async (req, res) => {
  try {
    // Get campaigns created by the user
    const createdCampaigns = await Campaign.find({ creator: req.user._id });

    // Get campaigns joined by the user
    const joinedCampaigns = await Campaign.find({
      "participants.user": req.user._id,
    });

    res.status(200).json({
      status: "success",
      data: {
        created: createdCampaigns,
        joined: joinedCampaigns,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get participants for a campaign (only for creator)
const getCampaignParticipants = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate(
      "participants.user",
      "name email age city state mobileNumber"
    );

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
        message: "You are not authorized to view this information",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        participants: campaign.participants,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Update campaign statuses (can be called via cron job)
const updateCampaignStatuses = async (req, res) => {
  try {
    await Campaign.updateAllCampaignStatuses();

    res.status(200).json({
      status: "success",
      message: "Campaign statuses updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  createCampaign,
  getAllCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  joinCampaign,
  leaveCampaign,
  getUserCampaigns,
  getCampaignParticipants,
  updateCampaignStatuses,
};
