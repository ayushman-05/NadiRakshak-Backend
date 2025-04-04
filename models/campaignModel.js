const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a campaign title"],
      trim: true,
      maxlength: [100, "Campaign title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide a campaign description"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    location: {
      type: String,
      required: [true, "Please provide a campaign location"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Please provide a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please provide an end date"],
    },
    maxParticipants: {
      type: Number,
      required: [true, "Please provide the maximum number of participants"],
      min: [1, "A campaign must have at least 1 participant"],
      max: [1000, "A campaign cannot have more than 1000 participants"],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A campaign must have a creator"],
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        additionalInfo: {
          type: Object,
          default: {},
        },
        // Track eligible participants (e.g., didn't leave right after joining)
        eligible: {
          type: Boolean,
          default: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["upcoming", "active", "finished"],
      default: "upcoming",
    },
    category: {
      type: String,
      required: [true, "Please provide a campaign category"],
      enum: ["Environment", "Health", "Education", "Social", "Other"],
    },
    image: {
      type: String,
      default: "default-campaign.jpg",
    },
    // Track if rewards have been distributed
    rewardsDistributed: {
      type: Boolean,
      default: false,
    },
    // Add isGovernment field
    isGovernment: {
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

// Virtual property to compute remaining spots
campaignSchema.virtual("spotsRemaining").get(function () {
  return this.maxParticipants - this.participants.length;
});

// Indexes for better query performance
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ creator: 1 });

// Auto-update status based on dates
campaignSchema.pre("save", function (next) {
  const now = new Date();

  if (now < this.startDate) {
    this.status = "upcoming";
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = "active";
  } else {
    this.status = "finished";
  }

  next();
});

// Static method to update statuses of all campaigns
campaignSchema.statics.updateAllCampaignStatuses = async function () {
  const now = new Date();

  // Update upcoming to active
  await this.updateMany(
    { status: "upcoming", startDate: { $lte: now } },
    { status: "active" }
  );

  // Update active to finished
  await this.updateMany(
    { status: "active", endDate: { $lt: now } },
    { status: "finished" }
  );
};

campaignSchema.index(
  {
    title: "text",
    description: "text",
    location: "text",
    category: "text",
  },
  {
    weights: {
      title: 10, // Title matches are most important
      description: 5, // Description matches are next important
      location: 2, // Location is less important
      category: 3, // Category has medium importance
    },
    name: "campaign_text_index",
  }
);

module.exports =
  mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
