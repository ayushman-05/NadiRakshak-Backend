const express = require("express");
const router = express.Router();

const {
  initiatePasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
} = require("../controllers/resetPassword");
const {
  initiateSignup,
  verifyOTPAndRegister,
} = require("../controllers/authSignupController");
const { getProfile, updateProfile } = require("../controllers/getProfile");
const {
  loginUser,
  refreshToken,
  logoutUser,
} = require("../controllers/authLoginController.js")
const {
  getUserPoints,getUserPointsHistory
} =require("../controllers/getPoints.js");
const { protect } = require("../middleware/authMiddleware");


//for signing user
router.post("/register", initiateSignup);
router.post("/verify-otp", verifyOTPAndRegister);


router.post("/login", loginUser);

router.post("/refresh-token", refreshToken);

router.post("/logout", protect, logoutUser);

router.get("/profile/", protect, getProfile);

// for resetting password
router.patch("/profile/", protect, updateProfile); 
router.post("/forgot-password", initiatePasswordReset);
router.post("/verify-reset-otp", verifyPasswordResetOTP);
router.post("/reset-password", resetPassword);
router.get("/points",protect,getUserPoints);
router.get("/points-history",protect,getUserPointsHistory);
module.exports = router;
