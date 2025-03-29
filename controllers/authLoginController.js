const User = require("../models/userModal");
const jwt = require("jsonwebtoken");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");

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


module.exports = {
  loginUser,
  refreshToken,
  logoutUser,
};
