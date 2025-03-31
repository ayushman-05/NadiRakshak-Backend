const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "An order must belong to a user"],
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "StoreItem",
          required: [true, "Order item must have a reference to a store item"],
        },
        quantity: {
          type: Number,
          required: [true, "Order item must have a quantity"],
          min: [1, "Quantity must be at least 1"],
        },
        pointsCost: {
          type: Number,
          required: [true, "Order item must have a points cost"],
        },
        // We store this to maintain historical record even if item details change later
        itemName: {
          type: String,
          required: [true, "Order item must have a name"],
        },
      },
    ],
    totalPointsCost: {
      type: Number,
      required: [true, "An order must have a total points cost"],
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    shippingAddress: {
      name: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: "India",
      },
    },
    trackingInfo: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
