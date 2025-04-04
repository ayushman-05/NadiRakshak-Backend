// routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { uploadCampaignImage } = require("../middleware/fileUploadMiddleware");
const { createDraftReport } = require("../controllers/reports/draftController");
const {
  getUserDrafts,
  getDraft,
  updateDraft,
  deleteDraft,
} = require("../controllers/reports/draftManagementController");
const { submitReport,updateReportStatus } = require("../controllers/reports/reportController");
const {
  getReports,
  getReportsInArea,
  getReportStats,
  getUserReports,
  getAcceptedReportLocations
} = require("../controllers/reports/reportQueryController");

// Draft routes
router.post("/drafts", protect, uploadCampaignImage, createDraftReport);
router.get("/drafts", protect, getUserDrafts);
router.get("/drafts/:id", protect, getDraft);
router.patch("/drafts/:id", protect, updateDraft);
router.delete("/drafts/:id", protect, deleteDraft);

// Final report submission
router.post("/submit/:draftId", protect, submitReport);

router.post("/update-report/:id",protect,updateReportStatus);
// Report queries
router.get("/my-reports",protect,getUserReports);
router.get("/", protect, getReports);
router.get("/area", protect, getReportsInArea);
router.get("/stats", protect, getReportStats);
router.get("/accepted-locations",  getAcceptedReportLocations);
module.exports = router;
