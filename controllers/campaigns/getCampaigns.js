const Campaign = require("../../models/campaignModel");
const User = require("../../models/userModal");

// Get all campaigns (with filters)
const getAllCampaigns = async (req, res) => {
  try {
    // Build query
    //let query = {};
    console.log(req.user);
    
    // Regular query without the available spots filter
    const campaigns = await Campaign.find();

    // Add isParticipant field to each campaign
    const enhancedCampaigns = campaigns.map((campaign) => {
      // Check if the user is a participant in this campaign
      const isParticipant =
        req.user &&
        campaign.participants.some(
          (p) => p.user && p.user.toString() === req.user._id.toString()
        );

      // Create a new object with the campaign data and isParticipant flag
      return {
        ...campaign.toObject(),
        isParticipant: isParticipant || false,
      };
    });

    res.status(200).json({
      status: "success",
      results: enhancedCampaigns.length,
      data: {
        campaigns: enhancedCampaigns,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get active and upcoming campaigns (with filters)
const getActiveAndUpcomingCampaigns = async (req, res) => {
  try {

    console.log(req.user);
    // Build query - only include active and upcoming campaigns
    let query = { status: { $in: ["active", "upcoming"] } };

    // Filter by isGovernment if provided
    if (req.query.isGovernment !== undefined) {
      query.isGovernment = req.query.isGovernment === "true";
    }



    // Regular query without the available spots filter
    const campaigns = await Campaign.find(query);

    // Add isParticipant field to each campaign
    const enhancedCampaigns = campaigns.map((campaign) => {
      // Check if the user is a participant in this campaign
      const isParticipant =
        req.user &&
        campaign.participants.some(
          (p) => p.user && p.user.toString() === req.user._id.toString()
        );

      const isGovernment= campaign.isGovernment;

      // Create a new object with the campaign data and isParticipant flag
      return {
        ...campaign.toObject(),
        isParticipant: isParticipant || false,
        isGovernment
      };
    });

    res.status(200).json({
      status: "success",
      results: enhancedCampaigns.length,
      data: {
        campaigns: enhancedCampaigns,
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
    const isParticipant =
      req.user &&
      campaign.participants.some((p) => p.user._id.equals(req.user._id));

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
        isParticipant,
      },
    });
  } catch (error) {
    res.status(400).json({
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
        isGovernment: campaign.isGovernment,
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
  getCampaign,
  getAllCampaigns,
  getActiveAndUpcomingCampaigns,
  getUserCampaigns,
  getCampaignParticipants,
};
