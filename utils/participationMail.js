const transporter = require("./transporterMail");

// Helper to send email notification
const sendParticipationEmail = async (email, campaignTitle) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Campaign Participation Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Campaign Participation Confirmed</h2>
        <p>You have successfully joined the campaign: <strong>${campaignTitle}</strong></p>
        <p>Thank you for your participation!</p>
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

module.exports = sendParticipationEmail;
