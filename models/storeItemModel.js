const mongoose = require("mongoose");

const storeItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide an item name"],
      trim: true,
      maxlength: [100, "Item name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide an item description"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    pointsCost: {
      type: Number,
      required: [true, "Please provide the points cost"],
      min: [1, "Points cost must be at least 1"],
    },
    image: {
      type: String,
      default: "default-item.jpg",
    },
    category: {
      type: String,
      required: [true, "Please provide an item category"],
      enum: [
        "Merchandise",
        "Vouchers",
        "Experiences",
        "Sustainability",
        "Other",
      ],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Please provide stock quantity"],
      min: [0, "Stock quantity cannot be negative"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field to check if the item is in stock
storeItemSchema.virtual("inStock").get(function () {
  return this.stockQuantity > 0 && this.isAvailable;
});

// Index for better query performance
storeItemSchema.index({ category: 1 });
storeItemSchema.index({ featured: 1 });
storeItemSchema.index({ pointsCost: 1 });

// Text index for search functionality
storeItemSchema.index(
  {
    name: "text",
    description: "text",
    category: "text",
  },
  {
    weights: {
      name: 10,
      description: 5,
      category: 3,
    },
    name: "store_item_text_index",
  }
);

module.exports =
  mongoose.models.StoreItem || mongoose.model("StoreItem", storeItemSchema);
// models/storeItemModel.js
// Add this before module.exports
storeItemSchema.pre('save', function(next) {
  if (this.stockQuantity <= 0) {
    this.isAvailable = false;
  }
  next();
});