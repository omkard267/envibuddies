// backend/controllers/sponsorshipIntentPaymentController.js

const SponsorshipIntent = require('../models/sponsorshipIntent');
const { 
  createPaymentOrder, 
  verifyPaymentSignature, 
  getPaymentDetails
} = require('../config/payment');
const { createOnlineReceipt, createManualReceipt } = require('./receiptController');

// Create payment order for accepted sponsorship intent
exports.createPaymentOrder = async (req, res) => {
  try {
    const { intentId } = req.params;
    const { amount, currency = 'INR' } = req.body;

    // Find the sponsorship intent
    const intent = await SponsorshipIntent.findById(intentId)
      .populate('organization', 'name')
      .populate('sponsor', 'name email phone');

    if (!intent) {
      return res.status(404).json({ message: 'Sponsorship intent not found' });
    }

    // Check if intent is approved and payment is pending
    if (intent.status !== 'approved') {
      return res.status(400).json({ 
        message: 'Payment can only be initiated for approved sponsorship intents' 
      });
    }

    // Check if intent is monetary
    if (intent.sponsorship.type !== 'monetary') {
      return res.status(400).json({ 
        message: 'Payment can only be initiated for monetary sponsorship intents' 
      });
    }

    // Check if payment is already completed
    if (intent.payment && intent.payment.status === 'completed') {
      return res.status(400).json({ 
        message: 'Payment has already been completed for this sponsorship intent' 
      });
    }

    // Use the amount from the sponsorship intent if not provided
    const paymentAmount = amount || intent.sponsorship.estimatedValue;

    // Basic amount validation (minimum 1 rupee)
    if (!paymentAmount || paymentAmount < 1) {
      return res.status(400).json({ 
        message: 'Invalid payment amount' 
      });
    }

    // Create payment order
    const order = await createPaymentOrder(
      paymentAmount, 
      currency, 
      `intent_${intentId.toString().slice(-6)}_${Date.now().toString(36)}`
    );

    // Update intent with payment order details
    await SponsorshipIntent.findByIdAndUpdate(intentId, {
      $set: {
        'payment.razorpayOrderId': order.id,
        'payment.gateway.orderId': order.id,
        'payment.amount': paymentAmount,
        'payment.status': 'pending'
      }
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      intent: {
        id: intent._id,
        organization: intent.organization.name,
        tier: intent.tier?.name,
        description: intent.sponsorship.description
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

// Verify and complete payment, then convert to sponsorship
exports.verifyPayment = async (req, res) => {
  // Start a database session for transaction
  const session = await SponsorshipIntent.startSession();
  session.startTransaction();

  try {
    const { intentId } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Find the sponsorship intent
    const intent = await SponsorshipIntent.findById(intentId).session(session);
    if (!intent) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sponsorship intent not found' });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);

    // Convert intent to sponsorship first
    const { convertIntentToSponsorship } = require('./sponsorshipIntentController');
    
    // Update the intent with payment amount before conversion
    intent.payment = {
      ...intent.payment,
      status: 'completed',
      paidAmount: paymentDetails.amount / 100,
      paymentDate: new Date(),
      razorpayPaymentId: razorpay_payment_id,
      gateway: {
        ...intent.payment?.gateway,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      },
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: req.user._id
    };
    
    const sponsorship = await convertIntentToSponsorship(intent);

    // Create receipt for online payment
    const receipt = await createOnlineReceipt(sponsorship._id, {
      amount: paymentDetails.amount / 100,
      paymentDate: new Date(),
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature
    });

    // Update intent with payment details and sponsorship link in one operation
    await SponsorshipIntent.findByIdAndUpdate(intentId, {
      $set: {
        'payment.status': 'completed',
        'payment.paidAmount': paymentDetails.amount / 100, // Convert from paise
        'payment.paymentDate': new Date(),
        'payment.razorpayPaymentId': razorpay_payment_id,
        'payment.gateway.paymentId': razorpay_payment_id,
        'payment.gateway.signature': razorpay_signature,
        'payment.verified': true,
        'payment.verifiedAt': new Date(),
        'payment.verifiedBy': req.user._id,
        'convertedTo': sponsorship._id,
        'status': 'converted'
      }
    }, { session });

    // Commit the transaction
    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Payment verified and sponsorship created successfully',
      sponsorship: {
        id: sponsorship._id,
        status: sponsorship.status,
        paymentStatus: sponsorship.payment.status,
        organization: sponsorship.organization?.name,
        tier: sponsorship.tier?.name
      },
      receipt: {
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        issueDate: receipt.issueDate
      }
    });

  } catch (error) {
    // Rollback the transaction on any error
    await session.abortTransaction();
    console.error('Error verifying payment:', error);
    
    // Log the error for debugging
    console.error('Payment verification failed for intent:', req.params.intentId);
    console.error('Error details:', error.message);
    
    res.status(500).json({ 
      message: 'Failed to verify payment. Please contact support if payment was deducted.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // End the session
    session.endSession();
  }
};

// Manual payment verification for failed verifications
exports.manualVerifyPayment = async (req, res) => {
  try {
    const { intentId } = req.params;
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      // New fields for any payment type
      paymentType,
      paymentReference,
      paymentDate,
      paymentAmount,
      paymentNotes,
      manualVerification
    } = req.body;

    // Find the sponsorship intent
    const intent = await SponsorshipIntent.findById(intentId);
    if (!intent) {
      return res.status(404).json({ message: 'Sponsorship intent not found' });
    }

    // Check if payment is already completed
    if (intent.payment?.status === 'completed') {
      return res.status(400).json({ message: 'Payment has already been verified' });
    }

    // Check if intent is already converted
    if (intent.status === 'converted' || intent.convertedTo) {
      return res.status(400).json({ message: 'Intent has already been converted to sponsorship' });
    }

    // Handle different payment types
    if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      // Razorpay payment verification
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

      // Check if payment was actually successful
      if (paymentDetails.status !== 'captured') {
        return res.status(400).json({ message: 'Payment was not successful' });
      }

      // Mark payment as completed with Razorpay details
      intent.payment = {
        ...intent.payment,
        status: 'completed',
        paidAmount: paymentDetails.amount / 100,
        paymentDate: new Date(),
        razorpayPaymentId: razorpay_payment_id,
        gateway: {
          ...intent.payment?.gateway,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature
        },
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user._id,
        paymentType: 'razorpay',
        paymentReference: razorpay_payment_id
      };
    } else if (manualVerification && paymentType && paymentReference && paymentAmount) {
      // Manual verification for any payment type
      const paidAmount = parseFloat(paymentAmount);
      if (isNaN(paidAmount) || paidAmount <= 0) {
        return res.status(400).json({ message: 'Invalid payment amount' });
      }

      // Mark payment as completed with manual verification details
      intent.payment = {
        ...intent.payment,
        status: 'completed',
        paidAmount: paidAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user._id,
        manualVerification: true,
        paymentType: paymentType,
        paymentReference: paymentReference,
        paymentNotes: paymentNotes || '',
        gateway: {
          type: paymentType,
          reference: paymentReference,
          notes: paymentNotes
        }
      };
    } else {
      return res.status(400).json({ 
        message: 'Invalid payment data. Please provide either Razorpay details or manual verification details.' 
      });
    }

    // Convert intent to sponsorship
    const { convertIntentToSponsorship } = require('./sponsorshipIntentController');
    const sponsorship = await convertIntentToSponsorship(intent);

    // Create receipt for manual payment verification
    const receipt = await createManualReceipt(sponsorship._id, {
      paymentType: paymentType,
      paymentAmount: paidAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentReference: paymentReference,
      paymentNotes: paymentNotes || '',
      verifiedBy: req.user._id
    });

    // Update intent with payment details and sponsorship link
    await SponsorshipIntent.findByIdAndUpdate(intentId, {
      $set: {
        'payment.status': 'completed',
        'payment.paidAmount': intent.payment.paidAmount,
        'payment.paymentDate': intent.payment.paymentDate,
        'payment.verified': true,
        'payment.verifiedAt': new Date(),
        'payment.verifiedBy': req.user._id,
        'payment.manualVerification': intent.payment.manualVerification || false,
        'payment.paymentType': intent.payment.paymentType,
        'payment.paymentReference': intent.payment.paymentReference,
        'payment.paymentNotes': intent.payment.paymentNotes,
        'payment.gateway': intent.payment.gateway,
        'convertedTo': sponsorship._id,
        'status': 'converted'
      }
    });

    res.json({
      success: true,
      message: 'Payment manually verified and sponsorship created successfully',
      sponsorship: {
        id: sponsorship._id,
        status: sponsorship.status,
        paymentStatus: sponsorship.payment.status,
        organization: sponsorship.organization?.name,
        tier: sponsorship.tier?.name,
        paymentType: intent.payment.paymentType
      },
      receipt: {
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        issueDate: receipt.issueDate
      }
    });

  } catch (error) {
    console.error('Error in manual payment verification:', error);
    res.status(500).json({ 
      message: 'Failed to manually verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get failed payment verifications for admin review
exports.getFailedVerifications = async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Find intents with pending payments but no conversion
    const failedVerifications = await SponsorshipIntent.find({
      organization: organizationId,
      status: 'approved',
      'sponsorship.type': 'monetary',
      $or: [
        { 'payment.status': 'pending' },
        { 'payment.status': { $exists: false } }
      ],
      convertedTo: { $exists: false }
    }).populate('sponsor', 'name email phone');

    res.json({
      success: true,
      failedVerifications
    });

  } catch (error) {
    console.error('Error getting failed verifications:', error);
    res.status(500).json({ message: 'Failed to get failed verifications' });
  }
};

// Get payment status for sponsorship intent
exports.getPaymentStatus = async (req, res) => {
  try {
    const { intentId } = req.params;

    const intent = await SponsorshipIntent.findById(intentId)
      .select('payment status tier sponsorship organization')
      .populate('organization', 'name');

    if (!intent) {
      return res.status(404).json({ message: 'Sponsorship intent not found' });
    }

    res.json({
      success: true,
      payment: intent.payment || { status: 'pending' },
      status: intent.status,
      tier: intent.tier,
      sponsorship: intent.sponsorship,
      organization: intent.organization
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ message: 'Failed to get payment status' });
  }
}; 