const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a user can only add an event once
calendarEventSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema); 