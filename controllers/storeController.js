const StoreItem = require("../models/storeItemModel");
const Order = require("../models/orderModel");
const User = require("../models/userModal");
const mongoose = require("mongoose");
const { sanitize } = require("express-mongo-sanitize");
const { uploadFileToFirebase } = require("../utils/fileUpload");

// Helper to sanitize input data
const sanitizeData = (data) => {
  // Use express-mongo-sanitize to prevent NoSQL injection
  const sanitized = sanitize(data);
  // Additional sanitization for strings (basic XSS prevention)
  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitized[key]
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
  }

  return sanitized;
};

// Get all store items (with filters)
const getAllStoreItems = async (req, res) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = StoreItem.find(JSON.parse(queryStr));

    // Search functionality
    if (req.query.search) {
      query = StoreItem.find({ $text: { $search: req.query.search } });
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-featured -createdAt");
    }

    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const items = await query;
    const total = await StoreItem.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: "success",
      results: items.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: {
        items,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get a single store item
const getStoreItem = async (req, res) => {
  try {
    const item = await StoreItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        status: "fail",
        message: "No item found with that ID",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        item,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Create a new store item (admin only)
const createStoreItem = async (req, res) => {
  try {
    // Check admin permissions - assuming you have middleware to check this
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to create store items",
      });
    }

    // Sanitize input data
    const sanitizedData = sanitizeData(req.body);

    // Handle image upload if a file was provided
    let imageUrl = "default-item.jpg";
    if (req.file) {
      try {
        imageUrl = await uploadFileToFirebase(req.file, "store-items");
      } catch (uploadError) {
        return res.status(400).json({
          status: "fail",
          message: `Image upload failed: ${uploadError}`,
        });
      }
    }

    // Create new store item with image URL
    const storeItem = await StoreItem.create({
      ...sanitizedData,
      image: imageUrl,
    });

    res.status(201).json({
      status: "success",
      data: {
        item: storeItem,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Update a store item (admin only)
const updateStoreItem = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to update store items",
      });
    }

    // Sanitize input data
    const sanitizedData = sanitizeData(req.body);

    // Handle image upload if a new image was provided
    if (req.file) {
      try {
        sanitizedData.image = await uploadFileToFirebase(
          req.file,
          "store-items"
        );
      } catch (uploadError) {
        return res.status(400).json({
          status: "fail",
          message: `Image upload failed: ${uploadError.message}`,
        });
      }
    }

    const updatedItem = await StoreItem.findByIdAndUpdate(
      req.params.id,
      sanitizedData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedItem) {
      return res.status(404).json({
        status: "fail",
        message: "No item found with that ID",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        item: updatedItem,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Delete a store item (admin only)
const deleteStoreItem = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to delete store items",
      });
    }

    const item = await StoreItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        status: "fail",
        message: "No item found with that ID",
      });
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  getAllStoreItems,
  getStoreItem,
  createStoreItem,
  updateStoreItem,
  deleteStoreItem,
};
