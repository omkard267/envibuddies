const mongoose = require('mongoose');

const sponsorshipIntentSchema = new mongoose.Schema({
  // Sponsor details (can be existing user or new contact)
  sponsor: {
    // If existing user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Contact details (required for all intents)
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    
    // Sponsor type
    sponsorType: {
      type: String,
      enum: ['business', 'individual'],
      required: true
    },
    
    // Business details (if business sponsor)
    business: {
      name: String,
      industry: String,
      website: String,
      description: String
    },
    
    // Individual details (if individual sponsor)
    individual: {
      profession: String,
      organization: String,
      designation: String
    },
    
    // Location
    location: {
      city: String,
      state: String,
      country: {
        type: String,
        default: 'India'
      }
    }
  },

  // Organization being approached
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Event being sponsored (optional)
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },

  // Sponsorship details
  sponsorship: {
    type: {
      type: String,
      enum: ['monetary', 'goods', 'service', 'media'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    estimatedValue: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    
    // Specific details based on type
    monetary: {
      amount: Number,
      paymentMethod: String,
      paymentTimeline: String
    },
    
    goods: {
      items: [String],
      quantity: String,
      deliveryTimeline: String
    },
    
    service: {
      serviceType: String,
      duration: String,
      expertise: String
    },
    
    media: {
      reach: String,
      platforms: [String],
      duration: String
    }
  },

  // Desired recognition
  recognition: {
    recognitionLevel: {
      type: String,
      enum: ['high', 'medium', 'low', 'minimal']
    },
    specificBenefits: [String],
    additionalRequests: String
  },

  // Application status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'converted', 'changes_requested', 'payment_completed'],
    default: 'pending'
  },

  // Review details
  review: {
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
    adminNotes: String, // Internal notes
    decision: {
      type: String,
      enum: ['approve', 'reject', 'request_changes', 'convert_to_sponsorship', 'delete_sponsorship', 'suspend_sponsorship', 'reactivate_sponsorship']
    },
    decisionNotes: String
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

  // If converted to full sponsorship
  convertedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sponsorship'
  },

  // Payment details (for monetary sponsorships)
  payment: {
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
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
  },

  // Track if sponsorship was deleted (to prevent recreation issues)
  sponsorshipDeleted: {
    type: Boolean,
    default: false
  },

  // Additional information
  additionalInfo: {
    howDidYouHear: String, // How they found the organization
    previousExperience: String, // Previous sponsorship experience
    timeline: String, // When they want to start
    specialRequirements: String,
    questions: String
  },

  // Email notification tracking
  emailNotifications: {
    sentToAdmin: {
      type: Boolean,
      default: false
    },
    sentToSponsor: {
      type: Boolean,
      default: false
    },
    adminEmailSentAt: Date,
    sponsorEmailSentAt: Date
  },

  // Change tracking and version history
  changeHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeType: {
      type: String,
      enum: ['created', 'updated', 'reviewed', 'status_changed', 'payment_status_changed', 'decision_changed']
    },
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    notes: String,
    // Additional context for payment-related changes
    paymentContext: {
      previousPaymentStatus: String,
      newPaymentStatus: String,
      decisionBefore: String,
      decisionAfter: String,
      adminNotes: String
    }
  }],

  // Track if admin suggestions were implemented
  adminSuggestions: {
    requested: [{
      field: String,
      suggestion: String,
      requestedAt: Date,
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      implemented: {
        type: Boolean,
        default: false
      },
      implementedAt: Date
    }],
    lastUpdated: Date
  }

}, { 
  timestamps: true 
});

// Indexes for better query performance
sponsorshipIntentSchema.index({ organization: 1 });
sponsorshipIntentSchema.index({ 'sponsor.user': 1 });
sponsorshipIntentSchema.index({ status: 1 });
sponsorshipIntentSchema.index({ createdAt: -1 });
sponsorshipIntentSchema.index({ 'sponsor.email': 1 });

// Compound indexes for common queries
sponsorshipIntentSchema.index({ organization: 1, status: 1 });
sponsorshipIntentSchema.index({ 'sponsor.user': 1, status: 1 });

module.exports = mongoose.model('SponsorshipIntent', sponsorshipIntentSchema); 