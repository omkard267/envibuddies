const mongoose = require('mongoose');

const recurringEventSeriesSchema = new mongoose.Schema({
  // Basic series info
  title: {
    type: String,
    required: true,
  },
  
  description: String,
  
  location: String,
  
  mapLocation: {
    address: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  
  // Series configuration
  recurringType: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true,
  },
  
  recurringValue: {
    type: String,
    required: true, // "Monday" for weekly, "1" for monthly
  },
  
  // Series creator and organization
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  
  // Series timing
  startDate: {
    type: Date,
    required: true,
  },
  
  endDate: {
    type: Date,
    default: null, // null means no end date
  },
  
  maxInstances: {
    type: Number,
    default: null, // null means unlimited
  },
  
  // Series status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active',
  },
  
  // Tracking
  currentInstanceNumber: {
    type: Number,
    default: 1,
  },
  
  totalInstancesCreated: {
    type: Number,
    default: 0,
  },
  
  // Series settings (copied from original event)
  eventType: String,
  maxVolunteers: Number,
  unlimitedVolunteers: Boolean,
  instructions: String,
  groupRegistration: Boolean,
  equipmentNeeded: [String],
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
  waterProvided: Boolean,
  medicalSupport: Boolean,
  ageGroup: String,
  precautions: String,
  publicTransport: String,
  contactPerson: String,
  
  // Organizer team (will be copied to each instance)
  organizerTeam: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'organizer' }
  }],
  
  // Series statistics
  totalRegistrations: {
    type: Number,
    default: 0,
  },
  
  totalAttendances: {
    type: Number,
    default: 0,
  },
  
  averageAttendance: {
    type: Number,
    default: 0,
  },
  
}, {
  timestamps: true
});

// Indexes for performance
recurringEventSeriesSchema.index({ createdBy: 1, status: 1 });
recurringEventSeriesSchema.index({ organization: 1, status: 1 });
recurringEventSeriesSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('RecurringEventSeries', recurringEventSeriesSchema); 