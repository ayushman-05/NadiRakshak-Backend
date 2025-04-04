const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  resendAttempts: {
    type: Number,
    default: 0,
    max: 1, // Maximum one resend attempt allowed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // OTP expires after 10 minutes
  },
});

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;
