const cloudinary = require('cloudinary').v2;

// Validate required environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary configuration error: Missing required environment variables');
  console.error('Please ensure the following are set in your .env file:');
  console.error('- CLOUDINARY_CLOUD_NAME');
  console.error('- CLOUDINARY_API_KEY');
  console.error('- CLOUDINARY_API_SECRET');
  throw new Error('Cloudinary configuration incomplete. Check your .env file.');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test the configuration
cloudinary.api.ping()
  .then(() => {
    console.log('✅ Cloudinary configured successfully - API connection test passed');
  })
  .catch((error) => {
    console.error('❌ Cloudinary configuration test failed:', error.message);
    throw new Error('Cloudinary configuration test failed. Check your credentials.');
  });

module.exports = cloudinary;
