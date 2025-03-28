const express = require("express");
const router = express.Router();
const {
  loginUser,
  refreshToken,
  logoutUser,
  getProfile,
  initiateSignup,
  verifyOTPAndRegister,
  initiatePasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", initiateSignup);
router.post("/verify-otp", verifyOTPAndRegister);

// Other routes remain the same
router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logoutUser);
router.get("/profile/", protect, getProfile);
router.post("/forgot-password", initiatePasswordReset);
router.post("/verify-reset-otp", verifyPasswordResetOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
