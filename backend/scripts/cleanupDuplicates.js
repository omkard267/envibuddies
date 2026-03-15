const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user');
const crypto = require('crypto');

dotenv.config();

/**
 * Generates a secure random token for account recovery
 */
const generateRecoveryToken = () => ({
  token: crypto.randomBytes(32).toString('hex'),
  expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
});

/**
 * Cleans up duplicate user accounts and ensures data consistency
 */
const cleanupDuplicates = async () => {
  let connection;
  try {
    // Connect to MongoDB
    connection = await mongoose.createConnection(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Register models on this connection
    const User = connection.model('User', require('../models/user').schema);
    
    console.log('✅ Connected to MongoDB');

    // Step 1: Clean up any expired recovery tokens
    const now = new Date();
    const result = await User.updateMany(
      { 
        'recoveryTokenExpires': { $lt: now },
        'recoveryToken': { $exists: true }
      },
      { 
        $unset: { 
          recoveryToken: '',
          recoveryTokenExpires: ''
        } 
      }
    );
    
    console.log(`✅ Cleared ${result.nModified} expired recovery tokens`);

    // Step 2: Find and handle duplicate emails (active accounts only)
    const duplicateEmails = await User.aggregate([
      {
        $match: {
          $or: [
            { isDeleted: { $exists: false } },
            { isDeleted: false }
          ],
          email: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { $toLower: '$email' },
          count: { $sum: 1 },
          docs: { 
            $push: {
              _id: '$_id',
              createdAt: '$createdAt',
              lastLogin: '$lastLogin',
              isVerified: '$isEmailVerified'
            }
          }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    console.log(`\n🔍 Found ${duplicateEmails.length} duplicate email(s)`);

    // Process duplicate emails
    for (const dup of duplicateEmails) {
      // Sort by: verified status, then last login, then creation date
      const sortedDocs = [...dup.docs].sort((a, b) => {
        // Prefer verified accounts
        if (a.isVerified !== b.isVerified) {
          return a.isVerified ? -1 : 1;
        }
        // Then prefer most recently active
        if (a.lastLogin || b.lastLogin) {
          return new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0);
        }
        // Finally, prefer oldest account
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      const [keep, ...toDelete] = sortedDocs;
      
      console.log(`\n📧 Handling duplicates for email: ${dup._id}`);
      console.log(`   Keeping: ${keep._id} (created: ${keep.createdAt}, verified: ${keep.isVerified})`);
      
      // Mark duplicates as deleted
      for (const doc of toDelete) {
        const recoveryToken = generateRecoveryToken();
        await User.findByIdAndUpdate(doc._id, {
          $set: { 
            isDeleted: true,
            deletedAt: new Date(),
            originalEmail: dup._id, // Store original email for recovery
            email: `deleted_${Date.now()}_${doc._id}@deleted.envibuddies.invalid`,
            recoveryToken: recoveryToken.token,
            recoveryTokenExpires: recoveryToken.expiresAt
          }
        });
        console.log(`   Marked as deleted: ${doc._id}`);
      }
    }

    // Step 3: Find and handle duplicate usernames (active accounts only)
    const duplicateUsernames = await User.aggregate([
      {
        $match: {
          $or: [
            { isDeleted: { $exists: false } },
            { isDeleted: false }
          ],
          username: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { $toLower: '$username' },
          count: { $sum: 1 },
          docs: { 
            $push: {
              _id: '$_id',
              email: '$email',
              createdAt: '$createdAt',
              lastLogin: '$lastLogin'
            }
          }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    console.log(`\n🔍 Found ${duplicateUsernames.length} duplicate username(s)`);

    // Process duplicate usernames
    for (const dup of duplicateUsernames) {
      // Sort by: last login, then creation date
      const sortedDocs = [...dup.docs].sort((a, b) => {
        // Prefer most recently active
        if (a.lastLogin || b.lastLogin) {
          return new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0);
        }
        // Then prefer oldest account
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      const [keep, ...toDelete] = sortedDocs;
      
      console.log(`\n👤 Handling duplicates for username: ${dup._id}`);
      console.log(`   Keeping: ${keep._id} (email: ${keep.email}, created: ${keep.createdAt})`);
      
      // Mark duplicates as deleted and generate recovery tokens
      for (const doc of toDelete) {
        const recoveryToken = generateRecoveryToken();
        await User.findByIdAndUpdate(doc._id, {
          $set: { 
            isDeleted: true,
            deletedAt: new Date(),
            originalEmail: doc.email, // Store original email for recovery
            email: `deleted_${Date.now()}_${doc._id}@deleted.envibuddies.invalid`,
            username: `deleted_${Date.now()}_${doc._id}`,
            recoveryToken: recoveryToken.token,
            recoveryTokenExpires: recoveryToken.expiresAt
          }
        });
        console.log(`   Marked as deleted: ${doc._id} (was: ${doc.email})`);
      }
    }

    // Step 4: Clean up any accounts with invalid email formats
    const invalidEmails = await User.find({
      email: { $regex: /^deleted_\d+_/ }
    });
    
    if (invalidEmails.length > 0) {
      console.log(`\n⚠️  Found ${invalidEmails.length} accounts with invalid email formats`);
      for (const user of invalidEmails) {
        if (!user.originalEmail) {
          console.log(`   User ${user._id} has invalid email but no originalEmail`);
        }
      }
    }

    console.log('✅ Cleanup completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
};

// Run the cleanup
(async () => {
  try {
    await cleanupDuplicates();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();
