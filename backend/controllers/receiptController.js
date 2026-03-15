const Receipt = require('../models/receipt');
const Sponsorship = require('../models/sponsorship');
const SponsorshipIntent = require('../models/sponsorshipIntent');

// Create receipt for online payment
exports.createOnlineReceipt = async (sponsorshipId, paymentDetails) => {
  try {
    const sponsorship = await Sponsorship.findById(sponsorshipId)
      .populate('organization', 'name address')
      .populate('sponsor', 'name email phone')
      .populate('event', 'title');

    if (!sponsorship) {
      throw new Error('Sponsorship not found');
    }

    // Generate receipt number manually as backup
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const fallbackReceiptNumber = `RCP-${year}${month}-${timestamp.toString().slice(-6)}`;

    const receipt = await Receipt.create({
      receiptNumber: fallbackReceiptNumber, // Set receipt number manually
      sponsorship: sponsorshipId,
      sponsorshipIntent: sponsorship.sponsorshipIntent,
      paymentType: 'razorpay',
      paymentAmount: paymentDetails.amount,
      paymentDate: paymentDetails.paymentDate || new Date(),
      paymentReference: paymentDetails.razorpayPaymentId,
      paymentNotes: `Online payment via Razorpay`,
      razorpayDetails: {
        paymentId: paymentDetails.razorpayPaymentId,
        orderId: paymentDetails.razorpayOrderId,
        signature: paymentDetails.razorpaySignature,
        gateway: 'razorpay'
      },
      organization: sponsorship.organization._id,
      sponsor: sponsorship.sponsor._id,
      event: sponsorship.event?._id
    });

    return receipt;
  } catch (error) {
    console.error('Error creating online receipt:', error);
    throw error;
  }
};

// Create receipt for manual payment verification
exports.createManualReceipt = async (sponsorshipId, paymentDetails) => {
  try {
    const sponsorship = await Sponsorship.findById(sponsorshipId)
      .populate('organization', 'name address')
      .populate('sponsor', 'name email phone')
      .populate('event', 'title');

    if (!sponsorship) {
      throw new Error('Sponsorship not found');
    }

    // Generate receipt number manually as backup
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const fallbackReceiptNumber = `RCP-${year}${month}-${timestamp.toString().slice(-6)}`;

    const receipt = await Receipt.create({
      receiptNumber: fallbackReceiptNumber, // Set receipt number manually
      sponsorship: sponsorshipId,
      sponsorshipIntent: sponsorship.sponsorshipIntent,
      paymentType: paymentDetails.paymentType,
      paymentAmount: paymentDetails.paymentAmount,
      paymentDate: paymentDetails.paymentDate || new Date(),
      paymentReference: paymentDetails.paymentReference,
      paymentNotes: paymentDetails.paymentNotes || '',
      manualVerification: {
        verifiedBy: paymentDetails.verifiedBy,
        verifiedAt: new Date(),
        notes: paymentDetails.paymentNotes || 'Manually verified payment'
      },
      organization: sponsorship.organization._id,
      sponsor: sponsorship.sponsor._id,
      event: sponsorship.event?._id
    });

    return receipt;
  } catch (error) {
    console.error('Error creating manual receipt:', error);
    throw error;
  }
};

// Get receipt by ID
exports.getReceiptById = async (req, res) => {
  try {
    const { receiptId } = req.params;

    const receipt = await Receipt.findById(receiptId)
      .populate('sponsorship', 'tier contribution description')
      .populate('organization', 'name address phone email')
      .populate('sponsor', 'name email phone')
      .populate('event', 'title date location')
      .populate('manualVerification.verifiedBy', 'name email');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    console.error('Error getting receipt:', error);
    res.status(500).json({ message: 'Failed to get receipt' });
  }
};

// Get receipts by sponsorship
exports.getReceiptsBySponsorship = async (req, res) => {
  try {
    const { sponsorshipId } = req.params;

    const receipts = await Receipt.find({ sponsorship: sponsorshipId })
      .populate('organization', 'name')
      .populate('sponsor', 'name')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error('Error getting receipts by sponsorship:', error);
    res.status(500).json({ message: 'Failed to get receipts' });
  }
};

// Get receipts by sponsor
exports.getReceiptsBySponsor = async (req, res) => {
  try {
    const { sponsorId } = req.params;

    const receipts = await Receipt.find({ sponsor: sponsorId })
      .populate('sponsorship', 'tier contribution description')
      .populate('organization', 'name')
      .populate('event', 'title date')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error('Error getting receipts by sponsor:', error);
    res.status(500).json({ message: 'Failed to get receipts' });
  }
};

// Get receipts by organization
exports.getReceiptsByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const receipts = await Receipt.find({ organization: organizationId })
      .populate('sponsorship', 'tier contribution description')
      .populate('sponsor', 'name email')
      .populate('event', 'title date')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error('Error getting receipts by organization:', error);
    res.status(500).json({ message: 'Failed to get receipts' });
  }
};

// Download receipt as PDF (placeholder for future implementation)
exports.downloadReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;

    const receipt = await Receipt.findById(receiptId)
      .populate('sponsorship', 'tier contribution description')
      .populate('organization', 'name address phone email')
      .populate('sponsor', 'name email phone')
      .populate('event', 'title date location')
      .populate('manualVerification.verifiedBy', 'name email');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // TODO: Implement PDF generation
    // For now, return receipt data
    res.json({
      success: true,
      receipt,
      message: 'PDF download feature coming soon'
    });
  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.status(500).json({ message: 'Failed to download receipt' });
  }
}; 