const Campaign = require("../../models/campaignModel");

// Update campaign statuses (called via cron job)
const updateCampaignStatuses = async (req, res) => {
  try {
    await Campaign.updateAllCampaignStatuses();

    res.status(200).json({
      status: "success",
      message: "Campaign statuses updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports={
    updateCampaignStatuses
}