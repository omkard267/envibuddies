const mongoose = require('mongoose');

const sponsorshipSchema = new mongoose.Schema({
  // Sponsor (references Sponsor model)
  sponsor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sponsor',
    required: true
  },

  // Organization being sponsored
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Event being sponsored (optional - can sponsor organization or specific event)
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },

  // Sponsorship type (package-based or custom)
  sponsorshipType: {
    type: String,
    enum: ['package', 'custom'],
    required: true
  },

  // If package-based sponsorship
  package: {
    name: String,
    tier: String,
    predefinedBenefits: [String]
  },

  // If custom sponsorship
  customContribution: {
    description: String,
    estimatedValue: Number,
    customBenefits: [String]
  },

  // Contribution details
  contribution: {
    type: {
      type: String,
      enum: ['monetary', 'goods', 'service', 'media'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: Date,
    deliveryNotes: String
  },

  // Tier information
  tier: {
    name: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'community'],
      required: true
    },
    calculatedAt: Date,
    calculatedValue: Number,
    manualOverride: {
      type: Boolean,
      default: false
    },
    overrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Status workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled', 'suspended'],
    default: 'pending'
  },

  // Application and review details
  application: {
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: Date,
    reviewedBy: {
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
    reviewNotes: String,
    adminNotes: String // Internal notes for organization admins
  },

  // Suspension tracking (for decision changes after conversion)
  suspension: {
    suspendedAt: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    suspensionReason: String,
    reactivatedAt: Date,
    reactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Sponsorship period
  period: {
    startDate: Date,
    endDate: Date,
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringFrequency: String // 'monthly', 'quarterly', 'yearly'
  },

  // Impact tracking
  impact: {
    volunteersSupported: {
      type: Number,
      default: 0
    },
    eventsSupported: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    beneficiariesReached: {
      type: Number,
      default: 0
    },
    environmentalImpact: String, // e.g., "1000 trees planted"
    socialImpact: String, // e.g., "500 students educated"
    lastUpdated: Date
  },

  // Recognition and visibility
  recognition: {
    logoDisplayed: {
      type: Boolean,
      default: false
    },
    socialMediaMentions: {
      type: Boolean,
      default: false
    },
    websiteAcknowledgement: {
      type: Boolean,
      default: false
    },
    eventAcknowledgement: {
      type: Boolean,
      default: false
    },
    certificateInclusion: {
      type: Boolean,
      default: false
    }
  },

  // Communication history
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'other']
    },
    date: Date,
    summary: String,
    nextAction: String,
    createdBy: {
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
    }
  }],

  // Documents and attachments
  documents: [{
    name: String,
    filePath: String,
    uploadedAt: Date,
    uploadedBy: {
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
    }
  }],

  // Payment tracking
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    amount: Number,
    paidAmount: {
      type: Number,
      default: 0
    },
    paymentMethod: String,
    transactionId: String,
    paymentDate: Date,
    notes: String,
    // Razorpay specific fields
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    // Payment gateway details
    gateway: {
      name: {
        type: String,
        default: 'razorpay'
      },
      orderId: String,
      paymentId: String,
      signature: String,
      refundId: String
    },
    // Payment verification
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }

}, { 
  timestamps: true 
});

// Indexes for better query performance
sponsorshipSchema.index({ sponsor: 1 });
sponsorshipSchema.index({ organization: 1 });
sponsorshipSchema.index({ event: 1 });
sponsorshipSchema.index({ status: 1 });
sponsorshipSchema.index({ 'tier.name': 1 });
sponsorshipSchema.index({ 'contribution.type': 1 });
sponsorshipSchema.index({ createdAt: -1 });

// Compound indexes for common queries
sponsorshipSchema.index({ organization: 1, status: 1 });
sponsorshipSchema.index({ sponsor: 1, status: 1 });
sponsorshipSchema.index({ event: 1, status: 1 });

module.exports = mongoose.model('Sponsorship', sponsorshipSchema); 