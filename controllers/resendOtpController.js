const User = require("../models/userModal");
const OTP = require("../models/otpSchema");
const TemporarySignup = require("../models/temporarySignupModel");
const crypto = require("crypto");
const { sendOTPEmail } = require("../utils/emailService");

/**
 * Resend OTP for either signup or password reset
 * @route POST /api/v1/auth/resend-otp
 */
const resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({
        success: false,
        message: "Email and type (signup or reset) are required",
      });
    }

    // Check if type is valid
    if (type !== "signup" && type !== "reset") {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'signup' or 'reset'",
      });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Handle based on type
    if (type === "signup") {
      // Check for existing temporary signup
      const tempSignup = await TemporarySignup.findOne({ email });

      if (!tempSignup) {
        return res.status(404).json({
          success: false,
          message: "No pending signup found for this email",
        });
      }

      // Check if already resent
      if (tempSignup.resendAttempts >= 1) {
        return res.status(400).json({
          success: false,
          message:
            "OTP resend limit reached. Please restart the signup process.",
        });
      }

      // Update OTP and increment resend attempts
      tempSignup.otp = otp;
      tempSignup.resendAttempts += 1;
      tempSignup.otpCreatedAt = Date.now();
      await tempSignup.save();

      // Send new OTP via email
      const emailSent = await sendOTPEmail(email, otp);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP",
        });
      }

      return res.status(200).json({
        success: true,
        message: "OTP resent successfully",
        email,
      });
    } else if (type === "reset") {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No user found with this email address",
        });
      }

      // Check if there's an existing OTP
      const existingOTP = await OTP.findOne({ email });

      if (!existingOTP) {
        return res.status(404).json({
          success: false,
          message: "No password reset request found for this email",
        });
      }

      // Check if already resent
      if (existingOTP.resendAttempts >= 1) {
        return res.status(400).json({
          success: false,
          message:
            "OTP resend limit reached. Please restart the password reset process.",
        });
      }

      // Update OTP and increment resend attempts
      existingOTP.otp = otp;
      existingOTP.resendAttempts += 1;
      existingOTP.createdAt = Date.now();
      await existingOTP.save();

      // Send new OTP via email
      const emailSent = await sendOTPEmail(email, otp);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Password reset OTP resent",
        email,
      });
    }
  } catch (error) {
    //console.error("Error in resendOTP:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resending OTP",
      error: error.message,
    });
  }
};

module.exports = { resendOTP };
