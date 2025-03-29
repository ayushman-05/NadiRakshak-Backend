const express = require("express");
const router = express.Router();
const {
  searchCampaigns,
  advancedSearchCampaigns,
} = require("../controllers/campaigns/searchCampaigns");

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
const { uploadCampaignImage } = require("../middleware/fileUploadMiddleware");

// Routes that require authentication
//router.use(protect);

// Campaign management
// Add these routes to your existing router in routes/campaignRoutes.js
router.route("/search").get(protect, searchCampaigns);
router.route("/advanced-search").get(protect, advancedSearchCampaigns);

// Updated routes with image upload middleware
router
  .route("/")
  .get(protect, getAllCampaigns)
  .post(protect, uploadCampaignImage, createCampaign);

router.route("/my-campaigns").get(protect, getUserCampaigns);
router.route("/update-statuses").patch(updateCampaignStatuses);

router
  .route("/:id")
  .get(protect, getCampaign)
  .patch(protect, uploadCampaignImage, updateCampaign)
  .delete(protect, deleteCampaign);

// Participation
router.route("/:id/join").post(protect, joinCampaign);
router.route("/:id/leave").delete(protect, leaveCampaign);
router.route("/:id/participants").get(protect, getCampaignParticipants);

module.exports = router;
