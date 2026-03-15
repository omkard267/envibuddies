// backend/models/resource.js
const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  type: {
    type: String,
    required: true,
    enum: [
      "youtube-video",
      "pdf",
      "image",
      "blog",
      "faq",
      "website",
      "news",
      "case-study",
      "event-report",
      "interview",
      "podcast",
      "workshop"
    ]
  },

  domain: {
    type: String,
    required: true,
    enum: [
      "Beach Cleanup",
      "Tree Plantation",
      "Awareness Drive",
      "Animal Rescue",
      "Education"
      // You can add more later
    ]
  },

  summary: {
    type: String // 1–2 line description for preview cards
  },

  url: {
    type: String // Link to PDF, YouTube embed, external site, etc.
  },

  thumbnail: {
    type: String // Optional - for video preview, PDF cover, etc.
  },

  content: {
    type: String // For blogs, news articles, case studies if stored as text
  },

  question: {
    type: String // Only for type === 'faq'
  },

  answer: {
    type: String // Only for type === 'faq'
  },

  source: {
    type: String // Optional - for external websites or news attribution
  },

  tags: [String], // For filtering and search

  language: {
    type: String,
    default: "en"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Resource", resourceSchema);
