const QRCode = require('qrcode');
const { uploadToCloudinary, deleteFromCloudinary } = require('./cloudinaryUtils');

// Generate QR code as buffer and upload to Cloudinary
const generateAndUploadQRCode = async (data, folder = 'qrcodes') => {
  try {
    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(JSON.stringify(data), {
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create a file-like object for Cloudinary upload
    const file = {
      buffer: qrBuffer,
      mimetype: 'image/png',
      originalname: `qr-${Date.now()}.png`
    };

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, folder);
    
    if (uploadResult.success) {
      return {
        success: true,
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        filename: file.originalname
      };
    } else {
      throw new Error(uploadResult.error);
    }
  } catch (error) {
    console.error('QR code generation and upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete QR code from Cloudinary
const deleteQRCode = async (qrCodeData) => {
  try {
    if (qrCodeData && qrCodeData.publicId) {
      const deleteResult = await deleteFromCloudinary(qrCodeData.publicId);
      return deleteResult.success;
    }
    return true; // No QR code to delete
  } catch (error) {
    console.error('QR code deletion error:', error);
    return false;
  }
};

// Generate entry QR code for registration
const generateEntryQRCode = async (registrationId, eventId, volunteerId) => {
  const qrData = {
    registrationId,
    eventId,
    volunteerId,
  };
  
  return await generateAndUploadQRCode(qrData, 'qrcodes/entry');
};

// Generate exit QR code for attendance
const generateExitQRCode = async (exitQrToken) => {
  const qrData = {
    exitQrToken
  };
  
  return await generateAndUploadQRCode(qrData, 'qrcodes/exit');
};

module.exports = {
  generateAndUploadQRCode,
  deleteQRCode,
  generateEntryQRCode,
  generateExitQRCode
};
