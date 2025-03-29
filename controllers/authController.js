const User = require("../models/userModal");
const jwt = require("jsonwebtoken");
const TemporarySignup = require("../models/temporarySignupModel");
const OTP = require("../models/otpSchema");
const crypto = require("crypto");
const { sendOTPEmail } = require("../utils/emailService");
const { ObjectId } = require("mongoose").Types;
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");
const Campaign =require("../models/campaignModel");

const initiateSignup = async (req, res) => {
  try {
    const { name, email, password, age, city, state, mobileNumber, role } =
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

// @desc    Authenticate a user
// @route   POST /api/v1/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
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

// @desc    Refresh access token
// @route   POST /api/auth/refresh
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user with the refresh token
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: refreshToken,
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
const logoutUser = async (req, res) => {
  try {
    // Remove refresh token from user
    const user = await User.findById(req.user._id);
    user.refreshToken = undefined;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Import ObjectId from Mongoose at the top of your file
const getProfile = async (req, res) => {
  try {
    // Find the user and populate participated campaigns with essential info
    const user = await User.findById(req.user._id).populate({
      path: "participatedCampaigns",
      select:
        "title description status startDate endDate category image location spotsRemaining maxParticipants",
    });

    // Find campaigns created by the user
    const createdCampaigns = await Campaign.find({
      creator: req.user._id,
    }).select(
      "title description status startDate endDate category image location spotsRemaining maxParticipants participants"
    );

    // Calculate user statistics
    const stats = {
      totalCampaignsCreated: createdCampaigns.length,
      totalCampaignsJoined: user.participatedCampaigns.length,
      activeCampaignsCreated: createdCampaigns.filter(
        (c) => c.status === "active"
      ).length,
      activeCampaignsJoined: user.participatedCampaigns.filter(
        (c) => c.status === "active"
      ).length,
      upcomingCampaignsCreated: createdCampaigns.filter(
        (c) => c.status === "upcoming"
      ).length,
      upcomingCampaignsJoined: user.participatedCampaigns.filter(
        (c) => c.status === "upcoming"
      ).length,
      finishedCampaignsCreated: createdCampaigns.filter(
        (c) => c.status === "finished"
      ).length,
      finishedCampaignsJoined: user.participatedCampaigns.filter(
        (c) => c.status === "finished"
      ).length,
      totalParticipantsManaged: createdCampaigns.reduce(
        (total, campaign) => total + campaign.participants.length,
        0
      ),
    };

    // Create user profile object with all necessary information
    const userProfile = {
      name: user.name,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      mobileNumber: user.mobileNumber,
      role: user.role,
      memberSince: user.createdAt,
      stats: stats,
      participatedCampaigns: user.participatedCampaigns,
      createdCampaigns: createdCampaigns,
    };

    res.status(200).json({
      status: "success",
      data: {
        profile: userProfile,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

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
  // registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getProfile,
  initiateSignup,
  verifyOTPAndRegister,
  initiatePasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
};
