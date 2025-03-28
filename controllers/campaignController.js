const Campaign = require("../models/CampaignModel");
const User = require("../models/UserModal");
const Instamojo = require("instamojo-nodejs");

// Configure Instamojo (you'll need to get these from Instamojo dashboard)
Instamojo.setKeys(
  process.env.INSTAMOJO_API_KEY,
  process.env.INSTAMOJO_AUTH_TOKEN
);
//Instamojo.isSandbox(true); // Set to false in production

exports.createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      isPaid,
      participationFee,
      bannerImage,
    } = req.body;

    const creator = req.user._id; // Assuming authentication middleware

    // Campaign Creation Payment
    const paymentParams = {
      purpose: "Campaign Creation Fee",
      amount: 2, // Fixed 2 Rs creation fee
      buyer_name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      redirect_url: `${process.env.FRONTEND_URL}/campaign/payment-success`,
    };

    // Create Instamojo Payment Request
    Instamojo.createPaymentRequest(paymentParams, async (error, response) => {
      if (error) {
        return res.status(400).json({ error: "Payment initiation failed" });
      }

      // If payment link created successfully
      const campaign = new Campaign({
        name,
        description,
        creator,
        startDate,
        endDate,
        bannerImage,
        isPaid,
        participationFee: isPaid ? participationFee : 0,
        paymentStatus: "pending",
      });

      await campaign.save();

      res.status(201).json({
        campaign,
        paymentLink: response.payment_request.longurl,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      status: { $in: ["upcoming", "active"] },
    }).populate("creator", "name");
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.participateInCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user._id;

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Check if campaign is active
    if (campaign.status !== "active") {
      return res
        .status(400)
        .json({ error: "Campaign is not currently active" });
    }

    // If campaign is paid, initiate payment
    if (campaign.isPaid) {
      const paymentParams = {
        purpose: `Campaign Participation: ${campaign.name}`,
        amount: campaign.participationFee,
        buyer_name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        redirect_url: `${process.env.FRONTEND_URL}/campaign/${campaignId}/payment-success`,
      };

      Instamojo.createPaymentRequest(paymentParams, async (error, response) => {
        if (error) {
          return res.status(400).json({ error: "Payment initiation failed" });
        }

        res.json({
          paymentLink: response.payment_request.longurl,
        });
      });
    } else {
      // Free campaign participation
      campaign.participants.push(userId);
      await campaign.save();

      // Update user's participated campaigns
      await User.findByIdAndUpdate(userId, {
        $addToSet: { participatedCampaigns: campaignId },
      });

      res.status(200).json({ message: "Successfully joined campaign" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
