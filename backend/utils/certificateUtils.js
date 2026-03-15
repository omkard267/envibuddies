const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { uploadToCloudinary, deleteFromCloudinary } = require('./cloudinaryUtils');

/**
 * Generate a certificate PDF and upload to Cloudinary.
 * @param {Object} options
 * @param {string} options.participantName
 * @param {string} options.eventName
 * @param {string} options.eventDate
 * @param {string} [options.eventLocation]
 * @param {string} options.awardTitle
 * @param {string} options.templateName - e.g. 'participation', 'best_volunteer', 'custom_award'
 * @param {string} [options.organizationLogo] - Cloudinary URL to logo (optional)
 * @param {string} [options.signatureImage] - Cloudinary URL to signature (optional)
 * @param {string} [options.issueDate]
 * @param {string} [options.verificationUrl] - Base URL for certificate verification (optional)
 * @returns {Promise<{ filePath: { url: string, publicId: string, filename: string }, certificateId: string }>}
 */
async function generateCertificate({
  participantName,
  eventName,
  eventDate,
  eventLocation = '',
  awardTitle = '',
  templateName,
  organizationLogo = null, // Make truly optional
  signatureImage = null, // Make truly optional
  issueDate = new Date().toLocaleDateString('en-GB'),
  verificationUrl = null, // Make truly optional
}) {
  try {
    // 1. Generate unique certificate ID
    const certificateId = uuidv4();
    
    // 2. Generate QR code (data: verification URL + cert ID)
    const qrData = verificationUrl ? `${verificationUrl}${certificateId}` : `Certificate ID: ${certificateId}`;
    const qrCode = await QRCode.toDataURL(qrData);

    // 3. Load HTML template
    let templatePath = path.join(__dirname, `../certificateTemplates/${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      // fallback to custom_award.html for unknown awards
      templatePath = path.join(__dirname, '../certificateTemplates/custom_award.html');
    }
    let html = fs.readFileSync(templatePath, 'utf-8');

    // 4. Prepare derived placeholders
    const eventLocationAt = eventLocation ? ` at ${eventLocation}` : '';

    // 5. Replace placeholders with fallbacks for missing images
    html = html
      .replace(/{{participantName}}/g, participantName)
      .replace(/{{eventName}}/g, eventName)
      .replace(/{{eventDate}}/g, eventDate)
      .replace(/{{eventLocation}}/g, eventLocation)
      .replace(/{{eventLocationAt}}/g, eventLocationAt)
      .replace(/{{awardTitle}}/g, awardTitle)
      .replace(/{{organizationLogo}}/g, organizationLogo || '') // Empty string if no logo
      .replace(/{{signatureImage}}/g, signatureImage || '') // Empty string if no signature
      .replace(/{{certificateId}}/g, certificateId)
      .replace(/{{qrCode}}/g, qrCode)
      .replace(/{{issueDate}}/g, issueDate);

    // 6. Render HTML to PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF as buffer with proper A4 landscape format
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      landscape: true, // Use landscape orientation for certificates
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    });
    
    await browser.close();

    // 7. Upload PDF buffer to Cloudinary
    const file = {
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      originalname: `${certificateId}.pdf`
    };

    const uploadResult = await uploadToCloudinary(file, 'certificates');
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload certificate to Cloudinary');
    }

    // 8. Return Cloudinary file data
    return {
      filePath: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        filename: file.originalname
      },
      certificateId
    };
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw error;
  }
}

/**
 * Delete certificate from Cloudinary
 * @param {Object} filePath - Certificate filePath object with publicId
 * @returns {Promise<boolean>} - Success status
 */
const deleteCertificate = async (filePath) => {
  try {
    if (filePath && filePath.publicId) {
      const deleteResult = await deleteFromCloudinary(filePath.publicId);
      return deleteResult.success;
    }
    return true; // No certificate to delete
  } catch (error) {
    console.error('Certificate deletion error:', error);
    return false;
  }
};

module.exports = {
  generateCertificate,
  deleteCertificate
};
