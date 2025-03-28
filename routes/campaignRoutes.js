const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const campaignController= require("../controllers/campaignController");

router.post(
  "/campaigns/create",
  protect,
  campaignController.createCampaign
);
router.get("/campaigns", campaignController.listCampaigns);
router.post(
  "/campaigns/:campaignId/participate",
  protect,
  campaignController.participateInCampaign
);

module.exports = router;
