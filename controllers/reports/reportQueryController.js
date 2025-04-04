const Report = require("../../models/reportModel");

// Get reports with filtering options
const getReports = async (req, res) => {
  try {
    const filter = {};

    // Apply filters if provided
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Date range filter
    if (req.query.fromDate && req.query.toDate) {
      filter.createdAt = {
        $gte: new Date(req.query.fromDate),
        $lte: new Date(req.query.toDate),
      };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")



    const total = await Report.countDocuments(filter);

    res.status(200).json({
      reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserReports = async (req, res) => {
  try {
    // Set base filter to only include reports from the current user
    const filter = { userId: req.user._id };

    // Apply additional filters if provided
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Date range filter
    if (req.query.fromDate && req.query.toDate) {
      filter.createdAt = {
        $gte: new Date(req.query.fromDate),
        $lte: new Date(req.query.toDate),
      };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get reports with pagination
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email");

    // Get total count for pagination
    const total = await Report.countDocuments(filter);

    res.status(200).json({
      reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get reports within a specified area (for map view)
const getReportsInArea = async (req, res) => {
  try {
    const { longitude, latitude, radius = 5000 } = req.query; // radius in meters

    if (!longitude || !latitude) {
      return res
        .status(400)
        .json({ message: "Longitude and latitude are required" });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius),
        },
      },
    }).populate("userId", "name");

    res.status(200).json({ reports });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get report statistics
const getReportStats = async (req, res) => {
  try {
    // Count by severity
    const severityCounts = await Report.aggregate([
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);

    // Count by status
    const statusCounts = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Reports by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reportsByDate = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Hotspots (areas with high concentration of reports)
    const hotspots = await Report.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [0, 0] },
          distanceField: "distance",
          spherical: true,
          query: {
            createdAt: { $gte: thirtyDaysAgo },
            severity: { $in: ["High", "Critical"] },
          },
        },
      },
      {
        $group: {
          _id: {
            $geoNear: {
              near: "$location",
              distanceField: "distance",
              maxDistance: 500,
              spherical: true,
            },
          },
          count: { $sum: 1 },
          avgSeverity: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$severity", "Low"] }, then: 1 },
                  { case: { $eq: ["$severity", "Medium"] }, then: 2 },
                  { case: { $eq: ["$severity", "High"] }, then: 3 },
                  { case: { $eq: ["$severity", "Critical"] }, then: 4 },
                ],
                default: 0,
              },
            },
          },
          location: { $first: "$location" },
        },
      },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      severityCounts,
      statusCounts,
      reportsByDate,
      hotspots,
    });
  } catch (error) {
    console.error("Error getting report stats:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReports, getReportsInArea, getReportStats,getUserReports };
