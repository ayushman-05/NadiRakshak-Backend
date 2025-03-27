const User = require("../models/userModal");
const { ObjectId } = require("mongoose").Types;
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");
const jwt = require("jsonwebtoken");

// @desc    Register new user
// @route   POST /api/v1/auth/register
// const registerUser = async (req, res) => {
//   try {
//     const { name, email, password, age, city, state, mobileNumber } = req.body;

//     // Check if user already exists
//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     // Create user
//     const user = await User.create({
//       name,
//       email,
//       password,
//       age,
//       city,
//       state,
//       mobileNumber,
//       role
//     });

//     // Generate tokens
//     const accessToken = generateAccessToken(user._id);
//     const refreshToken = generateRefreshToken(user._id);

//     // Save refresh token to user
//     user.refreshToken = refreshToken;
//     await user.save();

//     res.status(201).json({
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       accessToken,
//       refreshToken,
//     });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
const OTP = require("../models/otpSchema");
const { sendOTPEmail } = require("../utils/emailService");
const crypto = require("crypto");

// Initial signup - generate and send OTP
const initiateSignup = async (req, res) => {
  try {
    const { name, email, password, age, city, state, mobileNumber, role } =
      req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP in database
    await OTP.findOneAndDelete({ email }); // Remove any existing OTP for this email
    await OTP.create({ email, otp });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    // Store signup data in session or temporary storage
    req.session.pendingSignup = {
      name,
      email,
      password,
      age,
      city,
      state,
      mobileNumber,
      role,
    };

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

    // Check if signup data exists in session
    const pendingSignup = req.session.pendingSignup;
    if (!pendingSignup) {
      return res.status(400).json({ message: "No pending signup found" });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Create user
    const user = await User.create({
      name: pendingSignup.name,
      email: pendingSignup.email,
      password: pendingSignup.password,
      age: pendingSignup.age,
      city: pendingSignup.city,
      state: pendingSignup.state,
      mobileNumber: pendingSignup.mobileNumber,
      role: pendingSignup.role,
    });

    // Delete the OTP record
    await OTP.findOneAndDelete({ email, otp });

    // Clear session signup data
    delete req.session.pendingSignup;

    // Generate tokens (implement these functions as per your authentication logic)
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
    // Extract ID from request body
    const { id } = req.body;

    // Validate input
    if (!id) {
      return res.status(400).json({
        error: "INVALID_REQUEST",
        message: "User ID is required",
      });
    }
    console.log("Requested profile ID:", id);

    // Ensure the requester is accessing their own profile
    // Fix: If the IDs do NOT match, then return an unauthorized error.
    const isValidOwnProfile = req.user._id.equals(new ObjectId(id));
    if (!isValidOwnProfile) {
      return res.status(403).json({
        error: "UNAUTHORIZED",
        message: "You can only access your own profile",
      });
    }

    // Find user by ID, excluding sensitive fields
    const user = await User.findById(id).select("-password -refreshToken -__v");
    console.log("User lookup complete");

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "No user found with the provided ID",
      });
    }

    // Construct profile response
    const profile = {
      username: user.name,
      email: user.email,
      age: user.age,
      city: user.city,
      mobile: user.mobile,
    };

    // Successful response
    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Profile retrieval error:", error);

    // Handle specific Mongoose errors
    if (error.name === "CastError") {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "The provided user ID is not valid",
      });
    }

    // Generic server error
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "An unexpected error occurred while fetching the profile",
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
};
