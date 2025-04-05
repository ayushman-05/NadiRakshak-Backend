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
      points: user.points,
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
const updateProfile = async (req, res) => {
  try {
    // Get user from protect middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract allowed fields to update
    const { name, age, city, state, mobileNumber } = req.body;

    // Update only provided fields
    if (name) user.name = name;
    if (age) user.age = age;
    if (city) user.city = city;
    if (state) user.state = state;
    if (mobileNumber) user.mobileNumber = mobileNumber;

    // Ensure we're not modifying email or password
    if (req.body.email || req.body.password) {
      return res.status(400).json({
        message: "Email and password cannot be updated through this endpoint",
      });
    }

    // Save the updated user
    await user.save();

    // Return the updated profile without sensitive information
    res.status(200).json({
      status: "success",
      data: {
        profile: {
          name: user.name,
          age: user.age,
          city: user.city,
          state: user.state,
          mobileNumber: user.mobileNumber,
          role: user.role,
        },
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
   updateProfile,
  getProfile,
};
