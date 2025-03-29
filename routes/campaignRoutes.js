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
router.use(protect);

// Campaign management
router.route("/").get(getAllCampaigns).post(createCampaign);

router.route("/my-campaigns").get(getUserCampaigns);

router.route("/update-statuses").patch(updateCampaignStatuses);

router
  .route("/:id")
  .get(getCampaign)
  .patch(updateCampaign)
  .delete(deleteCampaign);

// Participation
router.route("/:id/join").post(joinCampaign);

router.route("/:id/leave").delete(leaveCampaign);

router.route("/:id/participants").get(getCampaignParticipants);

module.exports = router;
