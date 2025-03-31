// routes/newsRoutes.js
const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");
const { protect } = require("../middleware/authMiddleware");
const { restrictToAdmin } = require("../middleware/adminMiddleware");

// Public route to get news
router.get("/", newsController.getNews);

// Route to fetch and update news - can be restricted or open depending on your needs
// For cron job access, this should likely be protected by an API key or some form of authentication
router.post(
  "/update",
  protect,
  newsController.fetchAndUpdateNews
);

// Alternative route with API key for cron job access
router.post(
  "/update-cron",
  (req, res, next) => {
    // Simple API key validation for cron jobs
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;

    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: Invalid API key",
      });
    }

    next();
  },
  newsController.fetchAndUpdateNews
);

module.exports = router;
