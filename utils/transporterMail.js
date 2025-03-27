const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Or your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;