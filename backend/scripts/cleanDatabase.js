require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.js');
const Event = require('../models/event.js');
const Organization = require('../models/organization.js');
const Sponsorship = require('../models/sponsorship.js');
const SponsorshipIntent = require('../models/sponsorshipIntent.js');
const Sponsor = require('../models/sponsor.js');
const Registration = require('../models/registration.js');
const Resource = require('../models/resource.js');
const RecurringEventSeries = require('../models/recurringEventSeries.js');
const Receipt = require('../models/receipt.js');
const FAQ = require('../models/faq.js');
const CalendarEvent = require('../models/calendarEvent.js');
const Message = require('../models/Message.js');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean all collections
const cleanDatabase = async () => {
  try {
    console.log('Starting database cleanup...\n');

    // Clean Users collection
    console.log('Cleaning Users collection...');
    const userResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userResult.deletedCount} users`);

    // Clean Events collection
    console.log('Cleaning Events collection...');
    const eventResult = await Event.deleteMany({});
    console.log(`✅ Deleted ${eventResult.deletedCount} events`);

    // Clean Organizations collection
    console.log('Cleaning Organizations collection...');
    const orgResult = await Organization.deleteMany({});
    console.log(`✅ Deleted ${orgResult.deletedCount} organizations`);

    // Clean Sponsorships collection
    console.log('Cleaning Sponsorships collection...');
    const sponsorshipResult = await Sponsorship.deleteMany({});
    console.log(`✅ Deleted ${sponsorshipResult.deletedCount} sponsorships`);

    // Clean Sponsorship Intents collection
    console.log('Cleaning Sponsorship Intents collection...');
    const intentResult = await SponsorshipIntent.deleteMany({});
    console.log(`✅ Deleted ${intentResult.deletedCount} sponsorship intents`);

    // Clean Sponsors collection
    console.log('Cleaning Sponsors collection...');
    const sponsorResult = await Sponsor.deleteMany({});
    console.log(`✅ Deleted ${sponsorResult.deletedCount} sponsors`);

    // Clean Registrations collection
    console.log('Cleaning Registrations collection...');
    const registrationResult = await Registration.deleteMany({});
    console.log(`✅ Deleted ${registrationResult.deletedCount} registrations`);

    // Clean Resources collection
    console.log('Cleaning Resources collection...');
    const resourceResult = await Resource.deleteMany({});
    console.log(`✅ Deleted ${resourceResult.deletedCount} resources`);

    // Clean Recurring Event Series collection
    console.log('Cleaning Recurring Event Series collection...');
    const recurringResult = await RecurringEventSeries.deleteMany({});
    console.log(`✅ Deleted ${recurringResult.deletedCount} recurring event series`);

    // Clean Receipts collection
    console.log('Cleaning Receipts collection...');
    const receiptResult = await Receipt.deleteMany({});
    console.log(`✅ Deleted ${receiptResult.deletedCount} receipts`);

    // Clean FAQs collection
    console.log('Cleaning FAQs collection...');
    const faqResult = await FAQ.deleteMany({});
    console.log(`✅ Deleted ${faqResult.deletedCount} FAQs`);

    // Clean Calendar Events collection
    console.log('Cleaning Calendar Events collection...');
    const calendarResult = await CalendarEvent.deleteMany({});
    console.log(`✅ Deleted ${calendarResult.deletedCount} calendar events`);

    // Clean Messages collection
    console.log('Cleaning Messages collection...');
    const messageResult = await Message.deleteMany({});
    console.log(`✅ Deleted ${messageResult.deletedCount} messages`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('All collections are now empty but their structure is preserved.');
    console.log('You can now add new data to your collections.');

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
};

// Run the cleanup
if (require.main === module) {
  connectDB().then(() => {
    cleanDatabase();
  });
}

module.exports = { cleanDatabase };
