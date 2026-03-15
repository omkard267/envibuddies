const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import models
const User = require('../models/user');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Function to check if file exists locally
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

// Function to migrate a single profile image
const migrateProfileImage = async (user) => {
  try {
    if (!user.profileImage || user.profileImage.startsWith('http')) {
      console.log(`⏭️ Skipping user ${user.username} - no local profile image or already migrated`);
      return { success: true, skipped: true };
    }

    const localImagePath = path.join(__dirname, '../uploads/Profiles', user.profileImage);
    
    if (!fileExists(localImagePath)) {
      console.log(`⚠️ Local file not found for user ${user.username}: ${user.profileImage}`);
      return { success: false, error: 'Local file not found' };
    }

    // Read the file
    const fileBuffer = fs.readFileSync(localImagePath);
    const file = {
      buffer: fileBuffer,
      mimetype: 'image/jpeg', // Default mimetype
      originalname: user.profileImage
    };

    // Upload to Cloudinary
    console.log(`📤 Uploading profile image for user ${user.username} to Cloudinary...`);
    const uploadResult = await uploadToCloudinary(file, 'profiles');
    
    if (!uploadResult.success) {
      console.error(`❌ Failed to upload profile image for user ${user.username}:`, uploadResult.error);
      return { success: false, error: uploadResult.error };
    }

    // Update user record with Cloudinary URL
    await User.findByIdAndUpdate(user._id, {
      profileImage: uploadResult.url
    });

    console.log(`✅ Successfully migrated profile image for user ${user.username}`);
    
    // Optionally delete local file (uncomment if you want to remove local files)
    // fs.unlinkSync(localImagePath);
    // console.log(`🗑️ Deleted local file: ${localImagePath}`);

    return { 
      success: true, 
      oldUrl: user.profileImage,
      newUrl: uploadResult.url,
      publicId: uploadResult.publicId
    };

  } catch (error) {
    console.error(`❌ Error migrating profile image for user ${user.username}:`, error);
    return { success: false, error: error.message };
  }
};

// Function to migrate government ID proofs
const migrateGovtIdProof = async (user) => {
  try {
    if (!user.govtIdProofUrl || user.govtIdProofUrl.startsWith('http')) {
      console.log(`⏭️ Skipping govt ID proof for user ${user.username} - no local file or already migrated`);
      return { success: true, skipped: true };
    }

    const localFilePath = path.join(__dirname, '../uploads/Profiles', user.govtIdProofUrl);
    
    if (!fileExists(localFilePath)) {
      console.log(`⚠️ Local govt ID file not found for user ${user.username}: ${user.govtIdProofUrl}`);
      return { success: false, error: 'Local file not found' };
    }

    // Read the file
    const fileBuffer = fs.readFileSync(localFilePath);
    const file = {
      buffer: fileBuffer,
      mimetype: 'application/pdf', // Default mimetype for documents
      originalname: user.govtIdProofUrl
    };

    // Upload to Cloudinary
    console.log(`📤 Uploading govt ID proof for user ${user.username} to Cloudinary...`);
    const uploadResult = await uploadToCloudinary(file, 'documents');
    
    if (!uploadResult.success) {
      console.error(`❌ Failed to upload govt ID proof for user ${user.username}:`, uploadResult.error);
      return { success: false, error: uploadResult.error };
    }

    // Update user record with Cloudinary URL
    await User.findByIdAndUpdate(user._id, {
      govtIdProofUrl: uploadResult.url
    });

    console.log(`✅ Successfully migrated govt ID proof for user ${user.username}`);
    
    // Optionally delete local file (uncomment if you want to remove local files)
    // fs.unlinkSync(localFilePath);
    // console.log(`🗑️ Deleted local file: ${localFilePath}`);

    return { 
      success: true, 
      oldUrl: user.govtIdProofUrl,
      newUrl: uploadResult.url,
      publicId: uploadResult.publicId
    };

  } catch (error) {
    console.error(`❌ Error migrating govt ID proof for user ${user.username}:`, error);
    return { success: false, error: error.message };
  }
};

// Main migration function
const migrateAllProfileImages = async () => {
  try {
    console.log('🚀 Starting profile image migration to Cloudinary...');
    
    // Find all users with local profile images
    const usersWithLocalImages = await User.find({
      $or: [
        { profileImage: { $exists: true, $ne: null, $not: /^http/ } },
        { govtIdProofUrl: { $exists: true, $ne: null, $not: /^http/ } }
      ]
    });

    console.log(`📊 Found ${usersWithLocalImages.length} users with local images to migrate`);

    if (usersWithLocalImages.length === 0) {
      console.log('✅ No local images found to migrate');
      return;
    }

    const results = {
      total: usersWithLocalImages.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // Migrate profile images
    for (const user of usersWithLocalImages) {
      console.log(`\n🔄 Processing user: ${user.username} (${user._id})`);
      
      // Migrate profile image
      const profileResult = await migrateProfileImage(user);
      if (profileResult.success && !profileResult.skipped) {
        results.successful++;
        results.details.push({
          userId: user._id,
          username: user.username,
          type: 'profileImage',
          ...profileResult
        });
      } else if (profileResult.skipped) {
        results.skipped++;
      } else {
        results.failed++;
        results.details.push({
          userId: user._id,
          username: user.username,
          type: 'profileImage',
          ...profileResult
        });
      }

      // Migrate government ID proof
      const govtResult = await migrateGovtIdProof(user);
      if (govtResult.success && !govtResult.skipped) {
        results.successful++;
        results.details.push({
          userId: user._id,
          username: user.username,
          type: 'govtIdProof',
          ...govtResult
        });
      } else if (govtResult.skipped) {
        results.skipped++;
      } else {
        results.failed++;
        results.details.push({
          userId: user._id,
          username: user.username,
          type: 'govtIdProof',
          ...govtResult
        });
      }

      // Add a small delay to avoid overwhelming Cloudinary
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    console.log('\n📋 Migration Summary:');
    console.log(`Total users processed: ${results.total}`);
    console.log(`Successful migrations: ${results.successful}`);
    console.log(`Failed migrations: ${results.failed}`);
    console.log(`Skipped (already migrated): ${results.skipped}`);

    if (results.failed > 0) {
      console.log('\n❌ Failed migrations:');
      results.details
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`- ${r.username} (${r.type}): ${r.error}`);
        });
    }

    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrateAllProfileImages();
}

module.exports = { migrateAllProfileImages, migrateProfileImage, migrateGovtIdProof };
