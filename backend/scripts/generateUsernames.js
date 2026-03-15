const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

const generateUsername = (name, existingUsernames) => {
  // Remove special characters and convert to lowercase
  let baseUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20); // Limit to 20 characters

  if (!baseUsername) {
    baseUsername = 'user';
  }

  let username = baseUsername;
  let counter = 1;

  // Keep trying until we find a unique username
  while (existingUsernames.has(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
};

const migrateUsernames = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users without usernames
    const usersWithoutUsername = await User.find({ username: { $exists: false } });
    console.log(`📊 Found ${usersWithoutUsername.length} users without usernames`);

    if (usersWithoutUsername.length === 0) {
      console.log('✅ All users already have usernames');
      return;
    }

    // Get all existing usernames to avoid conflicts
    const existingUsernames = new Set();
    const usersWithUsername = await User.find({ username: { $exists: true } });
    usersWithUsername.forEach(user => existingUsernames.add(user.username));

    console.log(`📊 Found ${existingUsernames.size} existing usernames`);

    // Generate usernames for users without them
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutUsername) {
      try {
        const username = generateUsername(user.name, existingUsernames);
        
        await User.findByIdAndUpdate(user._id, { username });
        existingUsernames.add(username);
        successCount++;
        
        console.log(`✅ Generated username "${username}" for ${user.name} (${user.email})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error generating username for ${user.name} (${user.email}):`, error.message);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed migrations: ${errorCount} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsernames();
}

module.exports = { migrateUsernames, generateUsername }; 