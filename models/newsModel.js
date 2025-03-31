// models/newsModel.js
const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    urlToImage: {
      type: String,
    },
    publishedAt: {
      type: Date,
      required: true,
    },
    source: {
      id: String,
      name: String,
    },
    category: {
      type: String,
      enum: ["pollution", "government", "other"],
      default: "other",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ category: 1 });

module.exports = mongoose.models.News || mongoose.model("News", newsSchema);
