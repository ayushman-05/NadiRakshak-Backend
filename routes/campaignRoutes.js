const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createCampaign,
  verifyCampaignLaunchPayment,
  participateInCampaign,
  verifyParticipationPayment,
  getCampaigns,
} = require("../controllers/campaignController");

// Create campaign (requires authentication)
router.post("/", protect, createCampaign);

// Verify campaign launch payment
router.post("/verify-launch-payment", protect, verifyCampaignLaunchPayment);

// Get list of campaigns
router.get("/", getCampaigns);

// Participate in campaign
router.post("/:campaignId/participate", protect, participateInCampaign);

// Verify participation payment
router.post(
  "/verify-participation-payment",
  protect,
  verifyParticipationPayment
);

module.exports = router;
