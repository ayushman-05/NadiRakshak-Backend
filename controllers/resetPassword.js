const User = require("../models/userModal");
const OTP = require("../models/otpSchema");
const crypto = require("crypto");
const { sendOTPEmail } = require("../utils/emailService");

// Temporary storage for verified reset attempts
const passwordResetVerifications = new Map();

const initiatePasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email address",
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP in database
    await OTP.findOneAndDelete({ email }); // Remove any existing OTP for this email
    await OTP.create({ email, otp });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent",
      email: email,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Verify OTP
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate a unique verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Store verification status with a 10-minute expiry
    passwordResetVerifications.set(verificationToken, {
      email,
      timestamp: Date.now(),
      verified: true,
    });

    // Delete the OTP record
    await OTP.findOneAndDelete({ email, otp });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      verificationToken: verificationToken,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { verificationToken, newPassword } = req.body;

    // Check if verification token exists and is valid
    const verificationData = passwordResetVerifications.get(verificationToken);

    if (!verificationData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification",
      });
    }

    // Check if verification is recent (10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - verificationData.timestamp > TEN_MINUTES) {
      // Remove expired verification
      passwordResetVerifications.delete(verificationToken);

      return res.status(400).json({
        success: false,
        message: "Verification expired. Please start over.",
      });
    }

    // Find user
    const user = await User.findOne({ email: verificationData.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update password
    user.password = newPassword; // This will trigger pre-save hook to hash password
    await user.save();

    // Remove the verification token
    passwordResetVerifications.delete(verificationToken);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  initiatePasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
};
