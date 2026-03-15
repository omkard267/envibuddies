// scripts/fixMongoIndex.js
const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mumbaimitra', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Drop the existing index
    try {
      await usersCollection.dropIndex('oauthProvider_1_oauthId_1');
    } catch (err) {
      console.log('ℹ️ No existing index to drop or error dropping index:', err.message);
    }

    // Create the new partial index
    await usersCollection.createIndex(
      { oauthProvider: 1, oauthId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          oauthProvider: { $exists: true },
          oauthId: { $exists: true }
        }
      }
    );

    // Verify the index was created
    const indexes = await usersCollection.indexes();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixIndex();