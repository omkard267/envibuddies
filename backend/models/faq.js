const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['volunteer', 'organizer', 'general'],
    trim: true,
  },
}, { timestamps: true });

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ; 