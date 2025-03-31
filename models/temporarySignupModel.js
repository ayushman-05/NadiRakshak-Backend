const mongoose = require("mongoose");

const temporarySignupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Please provide a valid email",
    },
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters long"],
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
  role: {
    type: String,
    enum: ["Inspection", "Public","Admin"],
  },
  otp: {
    type: String,
    required: true,
  },
  otpCreatedAt: {
    type: Date,
    default: Date.now,
    expires: 600, // OTP expires after 10 minutes
  },
});

const TemporarySignup = mongoose.model(
  "TemporarySignup",
  temporarySignupSchema
);

module.exports = TemporarySignup;
