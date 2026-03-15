const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user');

dotenv.config();

const updateIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Drop existing unique indexes
    try {
      await mongoose.connection.collection('users').dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    } catch (err) {
      console.log('ℹ️ email_1 index not found or could not be dropped:', err.message);
    }

    try {
      await mongoose.connection.collection('users').dropIndex('username_1');
      console.log('✅ Dropped username_1 index');
    } catch (err) {
      console.log('ℹ️ username_1 index not found or could not be dropped:', err.message);
    }

    // Create new partial indexes
    await User.syncIndexes();
    console.log('✅ Created new partial indexes');

    console.log('✅ Index update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating indexes:', error);
    process.exit(1);
  }
};

updateIndexes();
