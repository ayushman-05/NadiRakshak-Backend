const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Campaign description is required"],
    },
    banner: {
      type: String, // URL or path to image
      default: null,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, "Campaign start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Campaign end date is required"],
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "finished"],
      default: "upcoming",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    participationFee: {
      type: Number,
      default: 0,
    },
    campaignLaunchFee: {
      type: Number,
      default: 2, // 2 Rs fixed fee as mentioned
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    maxParticipants: {
      type: Number,
      default: null, // Optional limit
    },
    paymentDetails: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
    },
    participantDetails: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        participationPaymentDetails: {
          razorpayOrderId: String,
          razorpayPaymentId: String,
          razorpaySignature: String,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to update campaign status
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

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = Campaign;
