// backend/controllers/paymentController.js

const Sponsorship = require('../models/sponsorship');
const SponsorshipIntent = require('../models/sponsorshipIntent');
const Organization = require('../models/organization');
const { 
  createPaymentOrder, 
  verifyPaymentSignature, 
  getPaymentDetails, 
  refundPayment 
} = require('../config/payment');

// Create payment order for accepted sponsorship application
exports.createPaymentOrder = async (req, res) => {
  try {
    const { sponsorshipId } = req.params;
    const { amount, currency = 'INR' } = req.body;

    // Find the sponsorship
    const sponsorship = await Sponsorship.findById(sponsorshipId)
      .populate('organization', 'name')
      .populate('sponsor', 'name email phone');

    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    // Check if sponsorship is approved or suspended and payment is pending
    if (sponsorship.status !== 'approved' && sponsorship.status !== 'suspended') {
      return res.status(400).json({ 
        message: 'Payment can only be initiated for approved or suspended sponsorships' 
      });
    }

    // Check if sponsorship is monetary
    if (sponsorship.contribution.type !== 'monetary') {
      return res.status(400).json({ 
        message: 'Payment can only be initiated for monetary sponsorships' 
      });
    }

    if (sponsorship.payment.status === 'completed') {
      return res.status(400).json({ 
        message: 'Payment has already been completed for this sponsorship' 
      });
    }

    // Use the amount from the sponsorship if not provided
    const paymentAmount = amount || sponsorship.contribution?.value;

    // Basic amount validation (minimum 1 rupee)
    if (!paymentAmount || paymentAmount < 1) {
      return res.status(400).json({ 
        message: 'Invalid payment amount' 
      });
    }

    // Create payment order
    const order = await createPaymentOrder(
      amount, 
      currency, 
      `spons_${sponsorshipId.toString().slice(-6)}_${Date.now().toString(36)}`
    );

    // Update sponsorship with payment order details
    await Sponsorship.findByIdAndUpdate(sponsorshipId, {
      'payment.razorpayOrderId': order.id,
      'payment.gateway.orderId': order.id,
      'payment.amount': amount,
      'payment.status': 'pending'
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      sponsorship: {
        id: sponsorship._id,
        organization: sponsorship.organization.name,
        tier: sponsorship.tier.name,
        description: sponsorship.contribution.description
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

// Verify and complete payment
exports.verifyPayment = async (req, res) => {
  try {
    const { sponsorshipId } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Find the sponsorship
    const sponsorship = await Sponsorship.findById(sponsorshipId);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);

    // Update sponsorship with payment details
    const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
      sponsorshipId,
      {
        'payment.status': 'completed',
        'payment.paidAmount': paymentDetails.amount / 100, // Convert from paise
        'payment.paymentDate': new Date(),
        'payment.razorpayPaymentId': razorpay_payment_id,
        'payment.gateway.paymentId': razorpay_payment_id,
        'payment.gateway.signature': razorpay_signature,
        'payment.verified': true,
        'payment.verifiedAt': new Date(),
        'payment.verifiedBy': req.user._id,
        'status': 'active', // Activate sponsorship after payment
        'contribution.delivered': true,
        'contribution.deliveredAt': new Date()
      },
      { new: true }
    ).populate('organization', 'name')
     .populate('sponsor', 'name email');

    // Send confirmation email to sponsor
    // TODO: Implement email notification

    res.json({
      success: true,
      message: 'Payment verified successfully',
      sponsorship: {
        id: updatedSponsorship._id,
        status: updatedSponsorship.status,
        paymentStatus: updatedSponsorship.payment.status,
        organization: updatedSponsorship.organization.name,
        tier: updatedSponsorship.tier.name
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { sponsorshipId } = req.params;

    const sponsorship = await Sponsorship.findById(sponsorshipId)
      .select('payment status tier contribution organization')
      .populate('organization', 'name');

    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    res.json({
      success: true,
      payment: sponsorship.payment,
      status: sponsorship.status,
      tier: sponsorship.tier,
      contribution: sponsorship.contribution,
      organization: sponsorship.organization
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ message: 'Failed to get payment status' });
  }
};

// Refund payment (admin only)
exports.refundPayment = async (req, res) => {
  try {
    const { sponsorshipId } = req.params;
    const { reason = 'Sponsorship cancellation' } = req.body;

    const sponsorship = await Sponsorship.findById(sponsorshipId);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    if (sponsorship.payment.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Only completed payments can be refunded' 
      });
    }

    if (!sponsorship.payment.gateway.paymentId) {
      return res.status(400).json({ 
        message: 'No payment ID found for refund' 
      });
    }

    // Process refund through Razorpay
    const refund = await refundPayment(
      sponsorship.payment.gateway.paymentId,
      null, // Full refund
      reason
    );

    // Update sponsorship with refund details
    await Sponsorship.findByIdAndUpdate(sponsorshipId, {
      'payment.status': 'refunded',
      'payment.gateway.refundId': refund.id,
      'status': 'cancelled',
      'suspension.suspendedAt': new Date(),
      'suspension.suspendedBy': req.user._id,
      'suspension.suspensionReason': `Payment refunded: ${reason}`
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ message: 'Failed to refund payment' });
  }
};

// Get payment configuration for frontend
exports.getPaymentConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        currency: paymentConfig.currency,
        paymentMethods: paymentConfig.paymentMethods,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error getting payment config:', error);
    res.status(500).json({ message: 'Failed to get payment configuration' });
  }
}; 