const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import models
const User = require('../models/user');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Function to check if Cloudinary URL is valid
const checkCloudinaryUrl = async (url) => {
  try {
    // First check if it's a valid Cloudinary URL format
    const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/[^\/]+\/image\/upload\/v\d+\/[^\/]+\/[^\/]+\.(jpg|jpeg|png|gif|webp)/i;
    if (!cloudinaryRegex.test(url)) {
      return { valid: false, reason: 'Invalid URL format' };
    }

    // Check if the URL has a reasonable length
    if (url.length < 50 || url.length > 500) {
      return { valid: false, reason: 'Suspicious URL length' };
    }

    // Make a HEAD request to check if the image exists
    const response = await axios.head(url, {
      timeout: 5000, // 5 second timeout
      validateStatus: (status) => status < 500 // Don't throw on 404, just return it
    });

    if (response.status === 200) {
      return { valid: true };
    } else if (response.status === 404) {
      return { valid: false, reason: 'Image not found (404)' };
    } else {
      return { valid: false, reason: `HTTP ${response.status}` };
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return { valid: false, reason: 'Request timeout' };
    } else if (error.response) {
      return { valid: false, reason: `HTTP ${error.response.status}` };
    } else {
      return { valid: false, reason: error.message };
    }
  }
};

// Function to clean up a single user's profile image
const cleanupUserProfileImage = async (user) => {
  try {
    if (!user.profileImage || !user.profileImage.startsWith('http')) {
      return { success: true, skipped: true, reason: 'No Cloudinary URL' };
    }

    console.log(`🔍 Checking profile image for user ${user.username || user.name}: ${user.profileImage}`);

    const urlCheck = await checkCloudinaryUrl(user.profileImage);
    
    if (urlCheck.valid) {
      console.log(`✅ Profile image for user ${user.username || user.name} is valid`);
      return { success: true, valid: true };
    }

    console.log(`❌ Invalid profile image for user ${user.username || user.name}: ${urlCheck.reason}`);

    // Remove the invalid profile image URL
    await User.findByIdAndUpdate(user._id, {
      $unset: { profileImage: 1 }
    });

    console.log(`🧹 Cleaned up invalid profile image for user ${user.username || user.name}`);

    return { 
      success: true, 
      cleaned: true, 
      oldUrl: user.profileImage,
      reason: urlCheck.reason
    };

  } catch (error) {
    console.error(`❌ Error cleaning up profile image for user ${user.username || user.name}:`, error);
    return { success: false, error: error.message };
  }
};

// Function to clean up government ID proofs
const cleanupUserGovtIdProof = async (user) => {
  try {
    if (!user.govtIdProofUrl || !user.govtIdProofUrl.startsWith('http')) {
      return { success: true, skipped: true, reason: 'No Cloudinary URL' };
    }

    console.log(`🔍 Checking govt ID proof for user ${user.username || user.name}: ${user.govtIdProofUrl}`);

    const urlCheck = await checkCloudinaryUrl(user.govtIdProofUrl);
    
    if (urlCheck.valid) {
      console.log(`✅ Govt ID proof for user ${user.username || user.name} is valid`);
      return { success: true, valid: true };
    }

    console.log(`❌ Invalid govt ID proof for user ${user.username || user.name}: ${urlCheck.reason}`);

    // Remove the invalid govt ID proof URL
    await User.findByIdAndUpdate(user._id, {
      $unset: { govtIdProofUrl: 1 }
    });

    console.log(`🧹 Cleaned up invalid govt ID proof for user ${user.username || user.name}`);

    return { 
      success: true, 
      cleaned: true, 
      oldUrl: user.govtIdProofUrl,
      reason: urlCheck.reason
    };

  } catch (error) {
    console.error(`❌ Error cleaning up govt ID proof for user ${user.username || user.name}:`, error);
    return { success: false, error: error.message };
  }
};

// Main cleanup function
const cleanupInvalidCloudinaryUrls = async () => {
  try {
    console.log('🚀 Starting cleanup of invalid Cloudinary URLs...');

    // Get all users with profile images or govt ID proofs
    const users = await User.find({
      $or: [
        { profileImage: { $exists: true, $ne: null } },
        { govtIdProofUrl: { $exists: true, $ne: null } }
      ]
    });

    console.log(`📊 Found ${users.length} users with profile images or govt ID proofs`);

    let stats = {
      total: users.length,
      profileImages: { checked: 0, valid: 0, cleaned: 0, errors: 0 },
      govtIdProofs: { checked: 0, valid: 0, cleaned: 0, errors: 0 }
    };

    for (const user of users) {
      console.log(`\n--- Processing user: ${user.username || user.name} (${user._id}) ---`);

      // Check profile image
      if (user.profileImage) {
        stats.profileImages.checked++;
        const profileResult = await cleanupUserProfileImage(user);
        
        if (profileResult.success) {
          if (profileResult.valid) {
            stats.profileImages.valid++;
          } else if (profileResult.cleaned) {
            stats.profileImages.cleaned++;
          }
        } else {
          stats.profileImages.errors++;
        }
      }

      // Check govt ID proof
      if (user.govtIdProofUrl) {
        stats.govtIdProofs.checked++;
        const govtIdResult = await cleanupUserGovtIdProof(user);
        
        if (govtIdResult.success) {
          if (govtIdResult.valid) {
            stats.govtIdProofs.valid++;
          } else if (govtIdResult.cleaned) {
            stats.govtIdProofs.cleaned++;
          }
        } else {
          stats.govtIdProofs.errors++;
        }
      }

      // Add a small delay to avoid overwhelming Cloudinary
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    console.log('\n📈 Cleanup Summary:');
    console.log('==================');
    console.log(`Total users processed: ${stats.total}`);
    console.log('\nProfile Images:');
    console.log(`  Checked: ${stats.profileImages.checked}`);
    console.log(`  Valid: ${stats.profileImages.valid}`);
    console.log(`  Cleaned: ${stats.profileImages.cleaned}`);
    console.log(`  Errors: ${stats.profileImages.errors}`);
    console.log('\nGovernment ID Proofs:');
    console.log(`  Checked: ${stats.govtIdProofs.checked}`);
    console.log(`  Valid: ${stats.govtIdProofs.valid}`);
    console.log(`  Cleaned: ${stats.govtIdProofs.cleaned}`);
    console.log(`  Errors: ${stats.govtIdProofs.errors}`);

    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the cleanup
cleanupInvalidCloudinaryUrls();
