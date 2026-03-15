// Script to generate AI summaries for existing recurring event instances
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/event');
const { generateMissingSummaries } = require('../utils/recurringEventUtils');

// Connect to MongoDB
const connectDB = require('../config/db');

const generateAllMissingSummaries = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find all recurring event series
    const RecurringEventSeries = require('../models/recurringEventSeries');
    const series = await RecurringEventSeries.find({});


    for (const seriesItem of series) {
      await generateMissingSummaries(seriesItem._id);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
generateAllMissingSummaries(); 