const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/campaignController");
const { protect } = require("../middleware/authMiddleware");

// Routes that require authentication
//router.use(protect);

// Campaign management
router.route("/").get(protect, getAllCampaigns).post(protect, createCampaign);

router.route("/my-campaigns").get(protect, getUserCampaigns);

router.route("/update-statuses").patch(updateCampaignStatuses);

router
  .route("/:id")
  .get(protect, getCampaign)
  .patch(protect, updateCampaign)
  .delete(protect, deleteCampaign);

// Participation
router.route("/:id/join").post(protect, joinCampaign);

router.route("/:id/leave").delete(protect, leaveCampaign);

router.route("/:id/participants").get(protect, getCampaignParticipants);

module.exports = router;
