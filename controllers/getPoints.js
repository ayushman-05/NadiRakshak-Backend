const User = require("../models/userModal");

// Get user's current points balance
const getUserPoints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        points: user.points,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get user's points history
const getUserPointsHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Get history with optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const pointsHistory = user.pointsHistory
      .sort((a, b) => b.createdAt - a.createdAt) // Sort by most recent first
      .slice(startIndex, endIndex);

    // Prepare pagination info
    const pagination = {};
    if (endIndex < user.pointsHistory.length) {
      pagination.next = {
        page: page + 1,
        limit: limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit: limit,
      };
    }

    res.status(200).json({
      status: "success",
      results: pointsHistory.length,
      pagination,
      data: {
        totalPoints: user.points,
        history: pointsHistory,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};


module.exports={
    getUserPoints,
    getUserPointsHistory
}