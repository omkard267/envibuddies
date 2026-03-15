const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  // Reference to sponsorship or sponsorship intent
  sponsorship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sponsorship',
    required: true
  },
  sponsorshipIntent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SponsorshipIntent'
  },
  
  // Receipt details
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  
  // Payment details
  paymentType: {
    type: String,
    enum: ['razorpay', 'cash', 'bank_transfer', 'check', 'upi', 'other'],
    required: true
  },
  paymentAmount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  paymentReference: {
    type: String,
    required: true
  },
  paymentNotes: String,
  
  // Razorpay specific details (if applicable)
  razorpayDetails: {
    paymentId: String,
    orderId: String,
    signature: String,
    gateway: String
  },
  
  // Manual verification details (if applicable)
  manualVerification: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Made optional for deleted users
    },
    // Denormalized user info for deleted users
    userInfo: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      username: String,
      email: String,
      phone: String,
      profileImage: String,
      role: String
    },
    // Indicates if the user is deleted
    isUserDeleted: {
      type: Boolean,
      default: false
    },
    // Tracks which deletion instance this anonymized data belongs to
    deletionId: {
      type: String,
      index: true,
      sparse: true
    },
    verifiedAt: Date,
    notes: String
  },
  
  // Organization and sponsor details
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  sponsor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sponsor',
    required: true
  },
  
  // Event details (if applicable)
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  
  // Receipt status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'refunded'],
    default: 'active'
  },
  
  // Additional metadata
  metadata: {
    currency: {
      type: String,
      default: 'INR'
    },
    exchangeRate: {
      type: Number,
      default: 1
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Generate receipt number
receiptSchema.pre('save', async function(next) {
  try {
    if (!this.receiptNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Get count of receipts for this month
      const count = await this.constructor.countDocuments({
        issueDate: {
          $gte: new Date(year, date.getMonth(), 1),
          $lt: new Date(year, date.getMonth() + 1, 1)
        }
      });
      
      this.receiptNumber = `RCP-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
  } catch (error) {
    console.error('Error generating receipt number:', error);
    // Fallback receipt number if generation fails
    this.receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    next();
  }
});

// Index for efficient queries
receiptSchema.index({ sponsorship: 1 });
receiptSchema.index({ sponsorshipIntent: 1 });
receiptSchema.index({ organization: 1 });
receiptSchema.index({ sponsor: 1 });
receiptSchema.index({ receiptNumber: 1 });

module.exports = mongoose.model('Receipt', receiptSchema); 