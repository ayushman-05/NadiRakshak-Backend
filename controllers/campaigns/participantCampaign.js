const Campaign = require("../../models/campaignModel");
const User = require("../../models/userModal");
const AppError = require("../../utils/appError");
const transporter = require("../../utils/transporterMail");
const mongoose = require("mongoose");
const sendParticipationEmail = require("../../utils/participationMail");

// Join a campaign
const joinCampaign = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Sanitize input data
      //const { additionalInfo } = req.body;

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
        //additionalInfo,
        //eligible: true,
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
      campaign.participants.splice(participantIndex, 1);

      // Calculate time since joining
      //const joinedAt = campaign.participants[participantIndex].joinedAt;
      //const now = new Date();
      //const timeElapsed = now - joinedAt; // in milliseconds
      //const hoursSinceJoining = timeElapsed / (1000 * 60 * 60);

      // If they leave within 24 hours of joining, mark them as ineligible for rewards
      // This prevents abuse (joining and immediately leaving to farm points)
      // if (hoursSinceJoining < 24) {
      //   campaign.participants[participantIndex].eligible = false;
      // }

      // We won't remove them from participants, just mark them as left for reward tracking purposes
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

module.exports = {
  joinCampaign,
  leaveCampaign,
};
