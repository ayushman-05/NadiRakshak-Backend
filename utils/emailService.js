const nodemailer = require("nodemailer");
require("dotenv").config();
const transporter=require("./transporterMail");

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Registration OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h3 style="background-color: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h3>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendResetPasswordLink = async(email,resetURL)=>{
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `
        You are receiving this email because you (or someone else) have requested a password reset.
        
        Please click on the following link or paste it into your browser to complete the process:
        
        ${resetURL}
        
        If you did not request this, please ignore this email and your password will remain unchanged.
        
        This link will expire in 10 minutes.
      `,
      html: `
        <h1>Password Reset Request</h1>
        <p>You are receiving this email because you (or someone else) have requested a password reset.</p>
        <p>Please click the button below to reset your password:</p>
        <a href="${resetURL}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block;">
          Reset Password
        </a>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p><small>This link will expire in 10 minutes.</small></p>
      `,
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
}

module.exports = { sendOTPEmail,sendResetPasswordLink};
