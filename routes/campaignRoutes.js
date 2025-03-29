const express = require("express");
const router = express.Router();
const {
  joinCampaign,
  leaveCampaign,
} = require("../controllers/campaigns/participantCampaign");
const {
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require("../controllers/campaigns/creatorCampaign");
const {
  getAllCampaigns,
  getCampaign,
  getUserCampaigns,
  getCampaignParticipants,
} = require("../controllers/campaigns/getCampaigns");
const {
  updateCampaignStatuses,
} = require("../controllers/campaigns/updateCampaignStatus");
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
