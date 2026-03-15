// backend/config/payment.js

const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Payment gateway configuration
const paymentConfig = {
  currency: 'INR',
  paymentMethods: {
    card: true,
    netbanking: true,
    upi: true,
    wallet: true,
    emi: false, // Disable EMI for donations
  }
};

// Create payment order
const createPaymentOrder = async (amount, currency = 'INR', receipt = null) => {
  try {
    // Generate a shorter receipt ID (max 40 characters for Razorpay)
    const generateReceiptId = () => {
      const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
      const random = Math.random().toString(36).substring(2, 8); // 6 random chars
      return `rcpt_${timestamp}_${random}`; // Format: rcpt_abc123_def456 (usually ~20 chars)
    };

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: receipt || generateReceiptId(),
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw new Error('Failed to create payment order');
  }
};

// Verify payment signature
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const text = `${orderId}|${paymentId}`;
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

// Get payment details
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
};

// Refund payment
const refundPayment = async (paymentId, amount = null, reason = 'Sponsorship cancellation') => {
  try {
    const refundOptions = {
      payment_id: paymentId,
      reason: reason,
    };

    if (amount) {
      refundOptions.amount = amount * 100; // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    return refund;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw new Error('Failed to refund payment');
  }
};

module.exports = {
  razorpay,
  paymentConfig,
  createPaymentOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  refundPayment,
}; 