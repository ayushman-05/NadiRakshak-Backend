const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    description: {
      type: String,
      required: true,
    },
    severitySuggestion: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "InReview", "Resolved", "Rejected"],
      default: "Pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
reportSchema.index({ location: "2dsphere" });

const Report = mongoose.model("Report", reportSchema);
module.exports = Report;
