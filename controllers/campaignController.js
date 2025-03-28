const Campaign = require("../models/campaignModel");
const RazorpayService = require("../utils/razorpayService");
const User = require("../models/userModal");

exports.createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      banner,
      startDate,
      endDate,
      isPaid,
      creator,
      participationFee,
      maxParticipants,
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    // Create initial campaign without participants
    const campaign = new Campaign({
      name,
      description,
      banner,
      creator,
      startDate,
      endDate,
      isPaid,
      participationFee: isPaid ? participationFee : 0,
      maxParticipants,
    });

    // Create Razorpay order for campaign launch fee
    const launchOrder = await RazorpayService.createCampaignLaunchOrder(
      campaign.campaignLaunchFee,  // Fee from the campaign model
        req.user._id,
        campaign._id  // Pass the campaign ID
    );

    // Attach Razorpay order details to campaign
    campaign.paymentDetails = {
      razorpayOrderId: launchOrder.id,
    };

    // Save campaign
    await campaign.save();

    res.status(201).json({
      success: true,
      data: {
        campaign,
        razorpayOrder: {
          id: launchOrder.id,
          amount: launchOrder.amount,
          currency: launchOrder.currency,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyCampaignLaunchPayment = async (req, res) => {
  try {
    const {
      campaignId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Find campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Verify payment signature
    const isValidSignature = RazorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Update campaign with payment details
    campaign.paymentDetails = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    };
    campaign.status = "upcoming"; // Confirm campaign creation
    await campaign.save();

    res.status(200).json({
      success: true,
      message: "Campaign launch payment verified",
      campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.participateInCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { additionalDetails } = req.body;

    // Find campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Check campaign status and participant limit
    if (campaign.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Campaign is not currently active",
      });
    }

    // Check if user is already participating
    if (campaign.participants.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You are already participating in this campaign",
      });
    }

    // Check max participants
    if (
      campaign.maxParticipants &&
      campaign.participants.length >= campaign.maxParticipants
    ) {
      return res.status(400).json({
        success: false,
        message: "Campaign has reached maximum participants",
      });
    }

    // If campaign is paid, create Razorpay order
    if (campaign.isPaid) {
      const participationOrder = await RazorpayService.createParticipationOrder(
        campaign.participationFee,
        req.user._id,
        campaignId
      );

      return res.status(200).json({
        success: true,
        message: "Participation requires payment",
        razorpayOrder: {
          id: participationOrder.id,
          amount: participationOrder.amount,
          currency: participationOrder.currency,
        },
      });
    }

    // If free campaign, directly add participant
    campaign.participants.push(req.user._id);
    await campaign.save();

    res.status(200).json({
      success: true,
      message: "Successfully joined campaign",
      campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyParticipationPayment = async (req, res) => {
  try {
    const {
      campaignId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Find campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Verify payment signature
    const isValidSignature = RazorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Add participant with payment details
    campaign.participantDetails.push({
      user: req.user._id,
      participationPaymentDetails: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
    });
    campaign.participants.push(req.user._id);
    await campaign.save();

    res.status(200).json({
      success: true,
      message: "Campaign participation payment verified",
      campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { status } = req.query;

    // Build query
    const query = status ? { status: status.toLowerCase() } : {};

    const campaigns = await Campaign.find(query)
      .populate("creator", "name email")
      .select("-participantDetails");

    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
