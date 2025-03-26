const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getProfile
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");



router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logoutUser);
router.get("/profile/",protect,getProfile);



module.exports = router;
