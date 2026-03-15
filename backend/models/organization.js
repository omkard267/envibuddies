// backend/models/organization.js

const mongoose = require('mongoose');

// ✅ Team Member Subschema with timestamps
const TeamMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for deleted users
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  position: String,
  isAdmin: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true }); // adds createdAt and updatedAt for each team member

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  logo: {
    type: String, // file path or URL (image/pdf)
  },
  headOfficeLocation: {
    type: String,
  },
  orgEmail: {
    type: String,
  },
  visionMission: {
    type: String,
  },
  orgPhone: {
    type: String,
  },
  yearOfEstablishment: {
    type: Number,
  },
  focusArea: {
    type: String, // dropdown, if 'Other', then custom text
  },
  focusAreaOther: {
    type: String, // only if focusArea is 'Other'
  },
  logoUrl: String,
  website: String,
  socialLinks: [String], // Array of URLs (LinkedIn, Instagram, etc.)

  documents: {
    gstCertificate: String, // file path or URL (image/pdf)
    panCard: String, // file path or URL (image/pdf)
    ngoRegistration: String, // file path or URL (image/pdf)
    letterOfIntent: String, // file path or URL (image/pdf)
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

  verifiedStatus: {
    type: String,
    enum: ['pending', 'blueApplicant', 'blueVerified', 'blueChampion'],
    default: 'pending',
  },

  // ✅ Organizers who joined or requested to join
  team: [TeamMemberSchema], // uses subschema with timestamps

  // Sponsorship settings
  sponsorship: {
    enabled: {
      type: Boolean,
      default: true  // Changed from false to true
    },
    description: String, // "We welcome sponsors to support our mission"
    contactEmail: String, // For sponsorship inquiries
    minimumContribution: {
      type: Number,
      default: 5000
    },
    allowCustomSponsorship: {
      type: Boolean,
      default: true
    },
    customSponsorshipContact: {
      email: String,
      phone: String,
      description: String // "Contact us for custom arrangements"
    }
  },

  // Sponsorship packages (for general org support)
  sponsorshipPackages: [{
    name: String, // "Environmental Champion"
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
      benefits: [String], // ["Logo on website", "Social media mentions"]
      description: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Current sponsors (references to Sponsorship model)
  sponsorships: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sponsorship'
  }],

  // Legacy sponsors field (keeping for backward compatibility)
  sponsors: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],

  volunteerImpact: {
    totalEvents: {
      type: Number,
      default: 0,
    },
    totalWasteCollectedKg: {
      type: Number,
      default: 0,
    },
    totalVolunteers: {
      type: Number,
      default: 0,
    }
  },

  // Sponsorship impact
  sponsorshipImpact: {
    totalSponsorships: {
      type: Number,
      default: 0
    },
    totalSponsorshipValue: {
      type: Number,
      default: 0
    },
    activeSponsors: {
      type: Number,
      default: 0
    },
    eventsWithSponsors: {
      type: Number,
      default: 0
    }
  }

}, { timestamps: true }); // adds createdAt and updatedAt to the org itself

module.exports = mongoose.model('Organization', organizationSchema);
