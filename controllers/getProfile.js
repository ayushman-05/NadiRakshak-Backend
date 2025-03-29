const User = require("../models/userModal");
const Campaign = require("../models/campaignModel");
// Import ObjectId from Mongoose at the top of your file
const getProfile = async (req, res) => {
  try {
    // Find the user and populate participated campaigns with essential info
    const user = await User.findById(req.user._id).populate({
      path: "participatedCampaigns",
      select:
        "title description status startDate endDate category image location spotsRemaining maxParticipants",
    });

    // Find campaigns created by the user
    const createdCampaigns = await Campaign.find({
      creator: req.user._id,
    }).select(
      "title description status startDate endDate category image location spotsRemaining maxParticipants participants"
    );

    // Calculate user statistics
    const stats = {
      totalCampaignsCreated: createdCampaigns.length,
      totalCampaignsJoined: user.participatedCampaigns.length,
      activeCampaignsCreated: createdCampaigns.filter(
        (c) => c.status === "active"
      ).length,
      activeCampaignsJoined: user.participatedCampaigns.filter(
        (c) => c.status === "active"
      ).length,
      upcomingCampaignsCreated: createdCampaigns.filter(
        (c) => c.status === "upcoming"
      ).length,
      upcomingCampaignsJoined: user.participatedCampaigns.filter(
        (c) => c.status === "upcoming"
      ).length,
      finishedCampaignsCreated: createdCampaigns.filter(
        (c) => c.status === "finished"
      ).length,
      finishedCampaignsJoined: user.participatedCampaigns.filter(
        (c) => c.status === "finished"
      ).length,
      totalParticipantsManaged: createdCampaigns.reduce(
        (total, campaign) => total + campaign.participants.length,
        0
      ),
    };

    // Create user profile object with all necessary information
    const userProfile = {
      name: user.name,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      mobileNumber: user.mobileNumber,
      role: user.role,
      memberSince: user.createdAt,
      stats: stats,
      participatedCampaigns: user.participatedCampaigns,
      createdCampaigns: createdCampaigns,
    };

    res.status(200).json({
      status: "success",
      data: {
        profile: userProfile,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  getProfile,
};
