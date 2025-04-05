const User = require("../models/userModal");
const TemporarySignup = require("../models/temporarySignupModel");
const crypto = require("crypto");
const { sendOTPEmail } = require("../utils/emailService");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");

const initiateSignup = async (req, res) => {
  try {
    const { name, email, password, age, city, state, mobileNumber,role } =
      req.body;

    // Check if user already exists in permanent Users collection
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check if there's an existing temporary signup
    await TemporarySignup.findOneAndDelete({ email });

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Create temporary signup entry
    const temporarySignup = new TemporarySignup({
      name,
      email,
      password,
      age,
      city,
      state,
      mobileNumber,
      role,
      otp,
    });

    // Save temporary signup
    await temporarySignup.save();

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      // Remove temporary signup if email fails
      await TemporarySignup.findOneAndDelete({ email });
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    res.status(200).json({
      message: "OTP sent successfully",
      email,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// const resendOTP = async (req,res)=>{
  
// }

// Verify OTP and complete registration
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find temporary signup entry
    const temporarySignup = await TemporarySignup.findOne({ email, otp });

    if (!temporarySignup) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Create permanent user
    const user = await User.create({
      name: temporarySignup.name,
      email: temporarySignup.email,
      password: temporarySignup.password,
      age: temporarySignup.age,
      city: temporarySignup.city,
      state: temporarySignup.state,
      mobileNumber: temporarySignup.mobileNumber,
      role: temporarySignup.role,
      points: 50,
    });

    user.pointsHistory.push({
      points: 50,
      reason: "Welcome bonus for signing up",
      source: "Signup",
    });
    // Delete temporary signup entry
    await TemporarySignup.findOneAndDelete({ email, otp });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


module.exports ={
    initiateSignup,
    verifyOTPAndRegister
}