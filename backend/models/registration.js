const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional for deleted users
  },
  // Denormalized volunteer info for deleted users
  volunteerInfo: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    username: String,
    email: String,
    phone: String,
    profileImage: String,
    role: String
  },
  // Indicates if the volunteer is deleted
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
  groupMembers: [
    {
      name: String,
      phone: String,
      email: String,
    },
  ],
  // Entry QR code (generated at registration, deleted after entry scan)
  qrCodePath: {
    url: { type: String, default: null }, // Cloudinary URL
    publicId: { type: String, default: null }, // Cloudinary public ID for deletion
    filename: { type: String, default: null }, // Original filename for reference
  },
  // In-time (set when entry QR is scanned by organizer)
  inTime: {
    type: Date,
    default: null,
  },
  // Out-time (set when exit QR is scanned by organizer)
  outTime: {
    type: Date,
    default: null,
  },
  // Unique token for exit QR (set at entry scan, deleted after exit scan)
  exitQrToken: {
    type: String,
    default: null,
    unique: true,
    sparse: true, // Required so multiple nulls are allowed; only non-null values are unique
  },
  // Exit QR code (generated on demand after inTime, deleted after exit scan)
  exitQrPath: {
    url: { type: String, default: null }, // Cloudinary URL
    publicId: { type: String, default: null }, // Cloudinary public ID for deletion
    filename: { type: String, default: null }, // Original filename for reference
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  hasAttended: {
    type: Boolean,
    default: false,
  },
  questionnaire: {
    completed: { type: Boolean, default: false },
    answers: { type: Object, default: {} },
    submittedAt: { type: Date }
  },

  // Time slot registration details
  selectedTimeSlot: {
    slotId: { type: String },
    slotName: { type: String },
    categoryId: { type: String },
    categoryName: { type: String }
  },

});

// Optional: static method to ensure indexes are built
registrationSchema.statics.ensureIndexes = async function() {
  await this.init();
};

module.exports = mongoose.model('Registration', registrationSchema);
