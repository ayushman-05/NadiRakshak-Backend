const mongoose = require("mongoose");

const draftReportSchema = new mongoose.Schema({
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
  },
  severitySuggestion: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
  },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours in seconds
  },
});

// Index for geospatial queries
draftReportSchema.index({ location: "2dsphere" });

const DraftReport = mongoose.model("DraftReport", draftReportSchema);
module.exports = DraftReport;
