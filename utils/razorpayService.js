const Razorpay = require("razorpay");
const crypto = require("crypto");

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  // Create order for campaign launch fee
  async createCampaignLaunchOrder(amount, userId) {
    // const options = {
    //   amount: amount * 100, // Convert to paise
    //   currency: "INR",
    //   receipt: `campaign_launch_${userId}_${Date.now()}`,
    //   payment_capture: 1, // Auto-capture payment
    // };

    // Updated order creation logic
    const options = {
      amount: campaign.campaignLaunchFee * 100, // amount in paise
      currency: "INR",
      receipt: `launch_${campaign._id.toString().slice(-10)}`, // Truncate to last 10 chars
      payment_capture: 1,
    };
    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error("Razorpay Order Creation Error:", error);
      throw new Error("Failed to create Razorpay order");
    }
  }

  // Create order for campaign participation fee
  async createParticipationOrder(amount, userId, campaignId) {
    const options = {
      amount: campaign.participationFee * 100, // amount in paise
      currency: "INR",
      receipt: `join_${campaign._id.toString().slice(-10)}_${Date.now()}`, // Unique, short receipt
      payment_capture: 1,
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error("Razorpay Participation Order Creation Error:", error);
      throw new Error("Failed to create participation order");
    }
  }

  // Verify payment signature
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature) {
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest("hex");

    return generatedSignature === signature;
  }
}

module.exports = new RazorpayService();
