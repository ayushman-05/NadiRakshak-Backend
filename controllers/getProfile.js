const User = require("../models/userModal");
const Campaign = require("../models/campaignModel");

const getProfile = async (req, res) => {
  try {
    // Find the user and populate participated campaigns with essential info
    const user = await User.findById(req.user._id).populate({
      path: "participatedCampaigns",
      select: "title",
    });

    // Find campaigns created by the user - include participants field
    const createdCampaigns = await Campaign.find({
      creator: req.user._id,
    }).select(
      "title participants" // Added participants to the select fields
    );

    // Calculate user statistics
    const stats = {
      totalCampaignsCreated: createdCampaigns.length,
      totalCampaignsJoined: user.participatedCampaigns.length,
      totalParticipantsManaged: createdCampaigns.reduce(
        (total, campaign) =>
          total + (campaign.participants ? campaign.participants.length : 0),
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
      //participatedCampaigns: user.participatedCampaigns,
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
