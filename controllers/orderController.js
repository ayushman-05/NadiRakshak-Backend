const Order = require("../models/orderModel");
const StoreItem = require("../models/storeItemModel");
const User = require("../models/userModal");
const mongoose = require("mongoose");
const { sanitize } = require("express-mongo-sanitize");
const transporter = require("../utils/transporterMail");

// Helper function to send order confirmation email
const sendOrderConfirmationEmail = async (user, order) => {
  try {
    const email = {
      to: user.email,
      subject: "Your Order Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your order!</h2>
          <p>Hello ${user.name},</p>
          <p>We have received your order and are processing it. Here are your order details:</p>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Order Date:</strong> ${new Date(
            order.createdAt
          ).toLocaleDateString()}</p>
          <p><strong>Total Points:</strong> ${order.totalPointsCost}</p>
          <h3>Items Ordered:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Item</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Points</th>
            </tr>
            ${order.items
              .map(
                (item) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  item.itemName
                }</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${
                  item.quantity
                }</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${
                  item.pointsCost * item.quantity
                }</td>
              </tr>
            `
              )
              .join("")}
          </table>
          <p>We will notify you when your order ships.</p>
          <p>Thank you for participating in our rewards program!</p>
        </div>
      `,
    };

    await transporter.sendMail(email);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    // Don't throw the error, just log it - we don't want to fail the order if the email fails
  }
};

// Create a new order
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Sanitize input data
    const sanitizedData = sanitize(req.body);
    const { items, shippingAddress } = sanitizedData;

    if (!items || !items.length) {
      return res.status(400).json({
        status: "fail",
        message: "No items provided for order",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        status: "fail",
        message: "Shipping address is required",
      });
    }

    // Get user
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Verify and calculate total points
    let totalPointsCost = 0;
    const orderItems = [];
    const itemsToUpdate = [];

    // Check if items exist and are in stock
    for (const orderItem of items) {
      const storeItem = await StoreItem.findById(orderItem.item).session(
        session
      );

      if (!storeItem) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          status: "fail",
          message: `Item with ID ${orderItem.item} not found`,
        });
      }

      if (!storeItem.isAvailable) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: "fail",
          message: `Item "${storeItem.name}" is not available`,
        });
      }

      if (storeItem.stockQuantity < orderItem.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: "fail",
          message: `Not enough stock for item "${storeItem.name}". Available: ${storeItem.stockQuantity}`,
        });
      }

      const itemPointsCost = storeItem.pointsCost * orderItem.quantity;
      totalPointsCost += itemPointsCost;

      orderItems.push({
        item: storeItem._id,
        quantity: orderItem.quantity,
        pointsCost: storeItem.pointsCost,
        itemName: storeItem.name,
      });

      // Prepare item for stock update
      itemsToUpdate.push({
        id: storeItem._id,
        quantity: orderItem.quantity,
      });
    }

    // Check if user has enough points
    if (user.points < totalPointsCost) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: "fail",
        message: `Not enough points. Required: ${totalPointsCost}, Available: ${user.points}`,
      });
    }

    // Create order
    const newOrder = await Order.create(
      [
        {
          user: user._id,
          items: orderItems,
          totalPointsCost,
          shippingAddress,
          status: "Pending",
        },
      ],
      { session }
    );

    // Update user points
    user.points -= totalPointsCost;
    user.pointsHistory.push({
      points: -totalPointsCost,
      reason: `Redeemed points for store order #${newOrder[0]._id}`,
      source: "Store Purchase",
      sourceId: newOrder[0]._id,
    });
    await user.save({ session });

    // Update item stock quantities
    for (const item of itemsToUpdate) {
      await StoreItem.findByIdAndUpdate(
        item.id,
        { $inc: { stockQuantity: -item.quantity } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Send confirmation email
    await sendOrderConfirmationEmail(user, newOrder[0]);

    res.status(201).json({
      status: "success",
      data: {
        order: newOrder[0],
        pointsRemaining: user.points,
      },
    });
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get all orders for current user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort("-createdAt")
      .populate({
        path: "items.item",
        select: "name image",
      });
      
    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get orders by status
const getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    // Validate status
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid order status",
      });
    }
    
    // Build query
    const query = {
      user: req.user._id,
      status: status,
    };
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .skip(skip)
      .limit(limit)
      .sort("-createdAt")
      .populate({
        path: "items.item",
        select: "name image category",
      });
    
    const total = await Order.countDocuments(query);
    
    res.status(200).json({
      status: "success",
      results: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: {
        orders,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
// Get a specific order
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "items.item",
      select: "name description image category",
    });

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    // Check if the order belongs to the current user or if user is admin
    if (!order.user.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission to access this order",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to update order status",
      });
    }

    const { status } = req.body;

    if (
      !status ||
      !["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Valid status is required",
      });
    }

    // For cancelled orders that were previously pending, refund points
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    // Handle order cancellation logic
    if (status === "Cancelled" && order.status === "Pending") {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Refund user's points
        const user = await User.findById(order.user).session(session);

        if (user) {
          user.points += order.totalPointsCost;
          user.pointsHistory.push({
            points: order.totalPointsCost,
            reason: `Refund for cancelled order #${order._id}`,
            source: "store_refund",
            sourceId: order._id,
          });
          await user.save({ session });
        }

        // Return items to inventory
        for (const item of order.items) {
          await StoreItem.findByIdAndUpdate(
            item.item,
            { $inc: { stockQuantity: item.quantity } },
            { session }
          );
        }

        // Update order status
        order.status = "Cancelled";
        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
          status: "success",
          data: {
            order,
          },
        });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } else {
      // Simple status update for non-cancellation
      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        status: "success",
        data: {
          order: updatedOrder,
        },
      });
    }
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to view all orders",
      });
    }

    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Order.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
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

    query = query.skip(skip).limit(limit).populate({
      path: "user",
      select: "name email",
    });

    // Execute query
    const orders = await query;
    const total = await Order.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: "success",
      results: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: {
        orders,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Add tracking information (admin only)
const addTrackingInfo = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to update tracking information",
      });
    }

    const { carrier, trackingNumber, trackingUrl } = req.body;

    if (!carrier || !trackingNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Carrier and tracking number are required",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    // Update tracking info and set status to shipped
    order.trackingInfo = {
      carrier,
      trackingNumber,
      trackingUrl: trackingUrl || "",
    };

    if (order.status === "Processing") {
      order.status = "Shipped";
    }

    await order.save();

    res.status(200).json({
      status: "success",
      data: {
        order,
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
  createOrder,
  getUserOrders,
  getOrdersByStatus,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  addTrackingInfo,
};
