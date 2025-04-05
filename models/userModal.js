const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    age: {
      type: Number,
      min: [7, "You must be at least 7 years old"],
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    mobileNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Please provide a valid Indian mobile number",
      },
    },
    refreshToken: {
      type: String,
    },
    role: {
      type: String,
      enum: ["Inspection", "Public","admin"],
      default: "Public"
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    participatedCampaigns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
      },
    ],
    // New field for points system
    points: {
      type: Number,
      default: 0,
    },
    // Track point transactions for audit and history
    pointsHistory: [
      {
        points: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        source: {
          type: String,
          required: true,
        },
        sourceId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },
        createdAt: {
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add points
userSchema.methods.addPoints = async function (
  points,
  reason,
  source,
  sourceId
) {
  this.points += points;

  this.pointsHistory.push({
    points,
    reason,
    source,
    sourceId,
  });

  return this.save();
};

// Prevent model redefinition
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
