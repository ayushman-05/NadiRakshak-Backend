const Campaign = require("../../models/campaignModel");
const User = require("../../models/userModal");
const mongoose = require("mongoose");

// Update campaign statuses and distribute rewards for completed campaigns
const updateCampaignStatuses = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();

      // Update upcoming to active
      await Campaign.updateMany(
        { status: "upcoming", startDate: { $lte: now } },
        { status: "active" },
        { session }
      );

      // Find campaigns that have just finished
      const finishedCampaigns = await Campaign.find({
        status: "active",
        endDate: { $lt: now },
        rewardsDistributed: false,
      }).session(session);

      // Update them to finished
      await Campaign.updateMany(
        { status: "active", endDate: { $lt: now } },
        { status: "finished" },
        { session }
      );

      // Distribute rewards for each finished campaign
      for (const campaign of finishedCampaigns) {
        // Count eligible participants
        const eligibleParticipants = campaign.participants.filter(
          (p) => p.eligible
        );
        const participantCount = eligibleParticipants.length;

        // Calculate creator reward points
        const creatorPoints = Math.min(200, participantCount * 2);

        // Award points to creator
        if (creatorPoints > 0) {
          const creator = await User.findById(campaign.creator).session(
            session
          );
          if (creator) {
            creator.points += creatorPoints;
            creator.pointsHistory.push({
              points: creatorPoints,
              reason: `Reward for completing campaign: ${campaign.title}`,
              source: "campaign_creation",
              sourceId: campaign._id,
            });
            await creator.save({ session });
          }
        }

        // Award points to eligible participants
        for (const participant of eligibleParticipants) {
          const user = await User.findById(participant.user).session(session);
          if (user) {
            user.points += 20;
            user.pointsHistory.push({
              points: 20,
              reason: `Reward for participating in campaign: ${campaign.title}`,
              source: "campaign_participation",
              sourceId: campaign._id,
            });
            await user.save({ session });
          }
        }

        // Mark rewards as distributed
        campaign.rewardsDistributed = true;
        await campaign.save({ session });
      }

      await session.commitTransaction();

      res.status(200).json({
        status: "success",
        message: "Campaign statuses updated and rewards distributed",
        data: {
          updated: finishedCampaigns.length,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  updateCampaignStatuses,
};
