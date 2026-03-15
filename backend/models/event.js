const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: String,

  location: String, // The original string field remains untouched

  mapLocation: {
    address: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },

  startDateTime: {
    type: Date,
    required: true,
  },

  endDateTime: {
    type: Date,
    required: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for deleted users
  },
  // Denormalized creator info for deleted users
  creatorInfo: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    username: String,
    email: String,
    phone: String,
    profileImage: String,
    role: String
  },
  // Indicates if the creator is deleted
  isCreatorDeleted: {
    type: Boolean,
    default: false
  },
  // Tracks which deletion instance this anonymized data belongs to
  creatorDeletionId: {
    type: String,
    index: true,
    sparse: true
  },

  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },

  eventType: {
    type: String,
  },

  maxVolunteers: {
    type: Number,
    default: 0, // -1 for unlimited
  },

  unlimitedVolunteers: {
    type: Boolean,
    default: false,
  },

  volunteers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],

  eventImages: [
    {
      url: { type: String, required: true }, // Cloudinary URL
      publicId: { type: String, required: true }, // Cloudinary public ID for deletion
      filename: { type: String }, // Original filename for reference
    },
  ],

  govtApprovalLetter: {
    url: { type: String }, // Cloudinary URL
    publicId: { type: String }, // Cloudinary public ID for deletion
    filename: { type: String }, // Original filename for reference
  },

  instructions: {
    type: String,
  },

  groupRegistration: {
    type: Boolean,
    default: false,
  },

  recurringEvent: {
    type: Boolean,
    default: false,
  },

  recurringType: {
    type: String, // "weekly" or "monthly"
  },

  recurringValue: {
    type: String, // e.g. "Monday" or "1"
  },

  // NEW FIELDS FOR IMPROVED RECURRING EVENTS
  recurringSeriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringEventSeries',
    default: null,
  },

  recurringInstanceNumber: {
    type: Number,
    default: null, // 1, 2, 3, etc.
  },

  isRecurringInstance: {
    type: Boolean,
    default: false,
  },

  nextRecurringDate: {
    type: Date,
    default: null, // When the next instance should be created
  },

  recurringEndDate: {
    type: Date,
    default: null, // When the series should end
  },

  recurringMaxInstances: {
    type: Number,
    default: null, // Maximum number of instances to create
  },

  recurringStatus: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active',
  },

  equipmentNeeded: {
    type: [String],
    default: [],
  },

  // Extra Questionnaire Fields
  waterProvided: {
    type: Boolean,
    default: false,
  },

  medicalSupport: {
    type: Boolean,
    default: false,
  },

  ageGroup: {
    type: String,
  },

  precautions: {
    type: String,
  },

  publicTransport: {
    type: String,
  },

  contactPerson: {
    type: String,
  },

  // Gamified Questionnaire Completion
  questionnaire: {
    completed: { type: Boolean, default: false },
    answers: { type: Object, default: {} }, // Store answers as an object
    domain: { type: String }, // Optionally store the event domain/type
  },

  organizerTeam: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Made optional
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
      hasAttended: { type: Boolean, default: false },
      questionnaire: {
        completed: { type: Boolean, default: false },
        answers: { type: Object, default: {} },
        submittedAt: { type: Date },
        media: [
          {
            url: { type: String }, // Cloudinary URL
            publicId: { type: String }, // Cloudinary public ID for deletion
            filename: { type: String }, // Original filename for reference
          }
        ]
      }
    }
  ],

  organizerJoinRequests: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Made optional
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
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      _wasRejected: { type: Boolean, default: false },
    }
  ],

  summary: {
    type: String,
    default: '',
  },

  report: {
    content: { type: String, default: '' },
    generatedAt: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isGenerated: { type: Boolean, default: false }
  },

  certificates: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['volunteer', 'organizer', 'creator'] }, // NEW
      award: { type: String },
      certId: { type: String },
      filePath: {
        url: { type: String }, // Cloudinary URL
        publicId: { type: String }, // Cloudinary public ID for deletion
        filename: { type: String } // Original filename for reference
      },
      issuedAt: { type: Date },
      verificationUrl: { type: String },
      name: { type: String },
      profileImage: { type: String }
    }
  ],

  // Volunteer management arrays
  removedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Can re-register
  bannedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // Cannot re-register


  // Time slot functionality
  timeSlotsEnabled: {
    type: Boolean,
    default: false,
  },

  timeSlots: [{
    id: { type: String, required: true }, // Unique identifier
    name: { type: String, required: true }, // e.g., "Morning", "Afternoon"
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "12:00"
    categories: [{
      id: { type: String, required: true },
      name: { type: String, required: true }, // e.g., "Cleanup", "Garbage Collection"
      maxVolunteers: { type: Number, default: null }, // null = unlimited
      currentVolunteers: { type: Number, default: 0 }
    }]
  }],

  // Event-specific sponsorship
  sponsorship: {
    enabled: {
      type: Boolean,
      default: false
    },
    description: String, // "Sponsor this event to help us plant 1000 trees"
    minimumContribution: {
      type: Number,
      default: 5000
    },
    packages: [{
      name: String, // "Tree Planting Sponsor"
      description: String,
      status: {
        type: String,
        enum: ['draft', 'active', 'closed'],
        default: 'draft'
      },
      tiers: [{
        name: String, // "Platinum", "Gold", "Silver", "Community"
        minContribution: Number,
        maxSponsors: Number,
        benefits: [String], // ["Logo on banners", "Social media mentions"]
        description: String
      }]
    }],
    sponsorships: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsorship'
    }],
    totalSponsorshipValue: {
      type: Number,
      default: 0
    },
    sponsorCount: {
      type: Number,
      default: 0
    }
  }


}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
