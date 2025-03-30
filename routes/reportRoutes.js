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
const { submitReport } = require("../controllers/reports/reportController");
const {
  getReports,
  getReportsInArea,
  getReportStats,
} = require("../controllers/reports/reportQueryController");

// Draft routes
router.post("/drafts", protect, uploadCampaignImage, createDraftReport);
router.get("/drafts", protect, getUserDrafts);
router.get("/drafts/:id", protect, getDraft);
router.patch("/drafts/:id", protect, updateDraft);
router.delete("/drafts/:id", protect, deleteDraft);

// Final report submission
router.post("/submit/:draftId", protect, submitReport);

// Report queries
router.get("/", protect, getReports);
router.get("/area", protect, getReportsInArea);
router.get("/stats", protect, getReportStats);

module.exports = router;
