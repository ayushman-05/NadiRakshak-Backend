const express = require("express");
const router = express.Router();
const {
  loginUser,
  refreshToken,
  logoutUser,
  getProfile,
  initiateSignup,
  verifyOTPAndRegister,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");



// router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logoutUser);
router.get("/profile/",protect,getProfile);
router.post("/register", initiateSignup);
router.post("/verify-otp", verifyOTPAndRegister);


module.exports = router;
