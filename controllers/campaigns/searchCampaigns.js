const Campaign = require("../../models/campaignModel");

/**
 * Search campaigns based on query text
 * Searches across title, description, location, and category fields
 */
const searchCampaigns = async (req, res) => {
  try {
    // Get search query from request
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: "fail",
        message: "Search query is required",
      });
    }

    // Build text search query
    // This creates a case-insensitive search across multiple fields
    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    };

    // Apply additional filters if provided
    if (req.query.status) {
      searchQuery.status = req.query.status;
    }

    if (req.query.category) {
      searchQuery.category = req.query.category;
    }

    if (req.query.startAfter) {
      searchQuery.startDate = { $gte: new Date(req.query.startAfter) };
    }

    if (req.query.endBefore) {
      searchQuery.endDate = {
        ...searchQuery.endDate,
        $lte: new Date(req.query.endBefore),
      };
    }

    // Add filter for isGovernment
    if (req.query.isGovernment !== undefined) {
      searchQuery.isGovernment = req.query.isGovernment === "true";
    }

    // Execute search query
    const campaigns = await Campaign.find(searchQuery);

    // Return results
    res.status(200).json({
      status: "success",
      results: campaigns.length,
      data: {
        campaigns,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

/**
 * Advanced search with additional features:
 * - Full-text search with text index
 * - Search result scoring and ranking
 * - Support for exact phrase matching
 * - Pagination
 */
const advancedSearchCampaigns = async (req, res) => {
  try {
    const {
      query,
      exact = false,
      page = 1,
      limit = 10,
      sortBy = "relevance", // Options: relevance, date, popularity
    } = req.query;

    if (!query) {
      return res.status(400).json({
        status: "fail",
        message: "Search query is required",
      });
    }

    // Skip value for pagination
    const skip = (page - 1) * limit;

    // Different search approaches based on exact match parameter
    let searchQuery;
    let sortOptions = {};

    if (exact === "true") {
      // Exact phrase search using regex
      const exactPhrase = new RegExp(`\\b${query}\\b`, "i");
      searchQuery = {
        $or: [
          { title: exactPhrase },
          { description: exactPhrase },
          { location: exactPhrase },
          { category: exactPhrase },
        ],
      };
    } else {
      // Use MongoDB text index for better performance (requires index setup)
      searchQuery = { $text: { $search: query } };

      // Add text score for relevance sorting
      if (sortBy === "relevance") {
        sortOptions = { score: { $meta: "textScore" } };
      }
    }

    // Apply additional filters
    if (req.query.status) {
      searchQuery.status = req.query.status;
    }

    if (req.query.category) {
      searchQuery.category = req.query.category;
    }

    // Date filters
    if (req.query.startAfter) {
      searchQuery.startDate = { $gte: new Date(req.query.startAfter) };
    }

    if (req.query.endBefore) {
      searchQuery.endDate = {
        ...searchQuery.endDate,
        $lte: new Date(req.query.endBefore),
      };
    }

    // Filter by isGovernment
    if (req.query.isGovernment !== undefined) {
      searchQuery.isGovernment = req.query.isGovernment === "true";
    }

    // Build sort options
    if (sortBy === "date") {
      sortOptions = { startDate: -1 };
    } else if (sortBy === "popularity") {
      // Sort by number of participants
      // This requires an aggregation pipeline
      const campaigns = await Campaign.aggregate([
        { $match: searchQuery },
        { $addFields: { participantCount: { $size: "$participants" } } },
        { $sort: { participantCount: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);

      // Count total matches for pagination info
      const totalResults = await Campaign.countDocuments(searchQuery);

      return res.status(200).json({
        status: "success",
        results: campaigns.length,
        totalResults,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResults / limit),
        data: {
          campaigns,
        },
      });
    }

    // Execute search query with sorting, pagination for non-popularity sorts
    const campaigns = await Campaign.find(
      searchQuery,
      sortBy === "relevance" ? { score: { $meta: "textScore" } } : {}
    )
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Count total matches for pagination info
    const totalResults = await Campaign.countDocuments(searchQuery);

    // Return results
    res.status(200).json({
      status: "success",
      results: campaigns.length,
      totalResults,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalResults / limit),
      data: {
        campaigns,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  searchCampaigns,
  advancedSearchCampaigns,
};
