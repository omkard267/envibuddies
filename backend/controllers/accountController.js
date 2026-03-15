/**
 * Account Controller - Handles account operations including deletion, recovery, and cleanup
 * 
 * Key Features:
 * - 7-day account recovery window after deletion
 * - Email blocking for deleted accounts during recovery period
 * - Comprehensive data anonymization
 * - Soft deletion with recovery capabilities
 * 
 * Recovery Window: Users can recover deleted accounts within 7 days
 * Email Blocking: Deleted email addresses cannot be used for new accounts during recovery period
 * After 7 days: Email becomes available for new accounts, old account cannot be recovered
 */

const User = require('../models/user');
const Message = require('../models/Message');
const Registration = require('../models/registration');
const Event = require('../models/event');
const Organization = require('../models/organization');
const Sponsor = require('../models/sponsor');
const Sponsorship = require('../models/sponsorship');
const SponsorshipIntent = require('../models/sponsorshipIntent');
const Receipt = require('../models/receipt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); // added jwt
const { validationResult } = require('express-validator');

// Comprehensive function to anonymize user data across all models
async function anonymizeUserData(userId, deletionId, originalUserData) {
  try {
    // Extract original user data for preservation
    const originalName = originalUserData?.name || 'Deleted User';
    const originalUsername = originalUserData?.username || 'deleted_user';
    
    // 1. Anonymize Messages (already handled by Message model)
    await Message.handleUserDeletion(userId);
    
    // 2. Clean up sponsor files from Cloudinary
    const Sponsor = require('./sponsor');
    const sponsor = await Sponsor.findOne({ user: userId });
    if (sponsor && sponsor.business) {
      try {
        const { deleteFromCloudinary } = require('../utils/cloudinaryUtils');
        
        // Delete logo if it exists
        if (sponsor.business.logo?.publicId) {
          await deleteFromCloudinary(sponsor.business.logo.publicId);
          console.log(`🗑️ Deleted sponsor logo from Cloudinary: ${sponsor.business.logo.publicId}`);
        }
        
        // Delete business documents if they exist
        if (sponsor.business.documents) {
          for (const [docType, docData] of Object.entries(sponsor.business.documents)) {
            if (docData && docData.publicId) {
              await deleteFromCloudinary(docData.publicId);
              console.log(`🗑️ Deleted sponsor ${docType} from Cloudinary: ${docData.publicId}`);
            }
          }
        }
      } catch (fileError) {
        console.error('⚠️ Error deleting sponsor files from Cloudinary:', fileError);
        // Continue with anonymization even if file deletion fails
      }
    }
    
    // 3. Anonymize Registrations
    await Registration.updateMany(
      { volunteerId: userId },
      { 
        $set: { 
          'volunteerInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'isUserDeleted': true,
          'deletionId': deletionId // Add deletionId to registration
        },
        $unset: { volunteerId: 1 }
      }
    );
    
    // 4. Anonymize Events (where user is creator or organizer)
    await Event.updateMany(
      { createdBy: userId },
      { 
        $set: { 
          'creatorInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'organizer'
          },
          'isCreatorDeleted': true,
          'deletionId': deletionId // Add deletionId to event
        },
        $unset: { createdBy: 1 }
      }
    );
    
    // Anonymize organizer team entries
    await Event.updateMany(
      { 'organizerTeam.user': userId },
      { 
        $set: { 
          'organizerTeam.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'organizer'
          },
          'organizerTeam.$.isUserDeleted': true,
          'organizerTeam.$.deletionId': deletionId // Add deletionId to organizer team entry
        },
        $unset: { 'organizerTeam.$.user': 1 }
      }
    );
    
    // Anonymize organizer join requests
    await Event.updateMany(
      { 'organizerJoinRequests.user': userId },
      { 
        $set: { 
          'organizerJoinRequests.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'organizer'
          },
          'organizerJoinRequests.$.isUserDeleted': true,
          'organizerJoinRequests.$.deletionId': deletionId // Add deletionId to organizer join request
        },
        $unset: { 'organizerJoinRequests.$.user': 1 }
      }
    );
    
    // 5. Anonymize Organizations
    await Organization.updateMany(
      { createdBy: userId },
      { 
        $set: { 
          'creatorInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'organizer'
          },
          'isCreatorDeleted': true,
          'deletionId': deletionId // Add deletionId to organization
        },
        $unset: { createdBy: 1 }
      }
    );
    
    // Anonymize team members
    await Organization.updateMany(
      { 'team.userId': userId },
      { 
        $set: { 
          'team.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'team.$.isUserDeleted': true,
          'team.$.deletionId': deletionId // Add deletionId to team member
        },
        $unset: { 'team.$.userId': 1 }
      }
    );
    
    // 5. Anonymize Sponsors
    await Sponsor.updateMany(
      { user: userId },
      { 
        $set: { 
          'userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'isUserDeleted': true,
          'deletionId': deletionId // Add deletionId to sponsor
        },
        $unset: { user: 1 }
      }
    );
    
    // 6. Anonymize Sponsorships
    await Sponsorship.updateMany(
      { 'communications.createdBy': userId },
      { 
        $set: { 
          'communications.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'communications.$.isUserDeleted': true,
          'communications.$.deletionId': deletionId // Add deletionId to sponsorship
        },
        $unset: { 'communications.$.createdBy': 1 }
      }
    );
    
    await Sponsorship.updateMany(
      { 'documents.uploadedBy': userId },
      { 
        $set: { 
          'documents.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'documents.$.isUserDeleted': true,
          'documents.$.deletionId': deletionId // Add deletionId to sponsorship document
        },
        $unset: { 'documents.$.uploadedBy': 1 }
      }
    );
    
    // 7. Anonymize Sponsorship Intents
    await SponsorshipIntent.updateMany(
      { 'communications.createdBy': userId },
      { 
        $set: { 
          'communications.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'communications.$.isUserDeleted': true,
          'communications.$.deletionId': deletionId // Add deletionId to sponsorship intent
        },
        $unset: { 'communications.$.createdBy': 1 }
      }
    );
    
    await SponsorshipIntent.updateMany(
      { 'documents.uploadedBy': userId },
      { 
        $set: { 
          'documents.$.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'documents.$.isUserDeleted': true,
          'documents.$.deletionId': deletionId // Add deletionId to sponsorship intent document
        },
        $unset: { 'documents.$.uploadedBy': 1 }
      }
    );
    
    // 8. Anonymize Receipts
    await Receipt.updateMany(
      { 'manualVerification.verifiedBy': userId },
      { 
        $set: { 
          'manualVerification.userInfo': {
            userId: userId,
            name: originalName,
            username: originalUsername,
            email: 'deleted@user.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer'
          },
          'manualVerification.isUserDeleted': true,
          'manualVerification.deletionId': deletionId // Add deletionId to receipt
        },
        $unset: { 'manualVerification.verifiedBy': 1 }
      }
    );
    
    console.log(`✅ Successfully anonymized data for user ${userId} with deletionId ${deletionId}`);
    
  } catch (error) {
    console.error(`❌ Error anonymizing data for user ${userId}:`, error);
    throw error; // Re-throw to handle in calling function
  }
}

// Create deletion history record for tracking
async function createDeletionHistory(user, previousDeletions) {
  try {
    // This could be stored in a separate collection for better tracking
    // For now, we'll log it and store in the user document
    console.log(`📝 Deletion History for ${user.originalEmail}:`);
    console.log(`   Current deletion: #${user.deletionSequence} (${user.deletionId})`);
    if (previousDeletions.length > 0) {
      console.log(`   Previous deletions: ${previousDeletions.map(d => `#${d.deletionSequence} (${d.deletionId})`).join(', ')}`);
    }
    
    // You could also store this in a separate DeletionHistory collection
    // const deletionHistory = new DeletionHistory({
    //   email: user.originalEmail,
    //   deletionId: user.deletionId,
    //   deletionSequence: user.deletionSequence,
    //   previousDeletionIds: user.previousDeletionIds,
    //   deletedAt: user.deletedAt,
    //   userId: user._id
    // });
    // await deletionHistory.save();
    
  } catch (error) {
    console.error('Error creating deletion history:', error);
    // Don't throw error as this is not critical to the deletion process
  }
}

// Restore anonymized data when account is recovered
async function restoreAnonymizedData(deletionId) {
  try {
    console.log(`🔄 Restoring anonymized data for deletionId: ${deletionId}`);
    
    // 1. Restore Registrations
    const registrations = await Registration.find({ 'deletionId': deletionId });
    for (const reg of registrations) {
      if (reg.volunteerInfo && reg.volunteerInfo.userId) {
        reg.volunteerId = reg.volunteerInfo.userId;
        reg.volunteerInfo = undefined;
        reg.isUserDeleted = false;
        reg.deletionId = undefined;
        await reg.save();
      }
    }
    
    // 2. Restore Events
    const events = await Event.find({ 'deletionId': deletionId });
    for (const event of events) {
      if (event.creatorInfo && event.creatorInfo.userId) {
        event.createdBy = event.creatorInfo.userId;
        event.creatorInfo = undefined;
        event.isCreatorDeleted = false;
        event.deletionId = undefined;
        await event.save();
      }
    }
    
    // Restore organizer team entries
    const eventsWithOrganizerTeam = await Event.find({ 'organizerTeam.deletionId': deletionId });
    for (const event of eventsWithOrganizerTeam) {
      for (const organizer of event.organizerTeam) {
        if (organizer.deletionId === deletionId && organizer.userInfo && organizer.userInfo.userId) {
          organizer.user = organizer.userInfo.userId;
          organizer.userInfo = undefined;
          organizer.isUserDeleted = false;
          organizer.deletionId = undefined;
        }
      }
      await event.save();
    }
    
    // Restore organizer join requests
    const eventsWithJoinRequests = await Event.find({ 'organizerJoinRequests.deletionId': deletionId });
    for (const event of eventsWithJoinRequests) {
      for (const request of event.organizerJoinRequests) {
        if (request.deletionId === deletionId && request.userInfo && request.userInfo.userId) {
          request.user = request.userInfo.userId;
          request.userInfo = undefined;
          request.isUserDeleted = false;
          request.deletionId = undefined;
        }
      }
      await event.save();
    }
    
    // 3. Restore Organizations
    const organizations = await Organization.find({ 'deletionId': deletionId });
    for (const org of organizations) {
      if (org.creatorInfo && org.creatorInfo.userId) {
        org.createdBy = org.creatorInfo.userId;
        org.creatorInfo = undefined;
        org.isCreatorDeleted = false;
        org.deletionId = undefined;
        await org.save();
      }
    }
    
    // Restore team members
    const orgsWithTeam = await Organization.find({ 'team.deletionId': deletionId });
    for (const org of orgsWithTeam) {
      for (const member of org.team) {
        if (member.deletionId === deletionId && member.userInfo && member.userInfo.userId) {
          member.userId = member.userInfo.userId;
          member.userInfo = undefined;
          member.isUserDeleted = false;
          member.deletionId = undefined;
        }
      }
      await org.save();
    }
    
    // 4. Restore Sponsors
    const sponsors = await Sponsor.find({ 'deletionId': deletionId });
    for (const sponsor of sponsors) {
      if (sponsor.userInfo && sponsor.userInfo.userId) {
        sponsor.user = sponsor.userInfo.userId;
        sponsor.userInfo = undefined;
        sponsor.isUserDeleted = false;
        sponsor.deletionId = undefined;
        await sponsor.save();
      }
    }
    
    // 5. Restore Sponsorships
    const sponsorships = await Sponsorship.find({ 'application.deletionId': deletionId });
    for (const sponsorship of sponsorships) {
      if (sponsorship.application.deletionId === deletionId && sponsorship.application.userInfo && sponsorship.application.userInfo.userId) {
        sponsorship.application.reviewedBy = sponsorship.application.userInfo.userId;
        sponsorship.application.userInfo = undefined;
        sponsorship.application.isUserDeleted = false;
        sponsorship.application.deletionId = undefined;
        await sponsorship.save();
      }
    }
    
    // Restore sponsorship communications
    const sponsorshipsWithComm = await Sponsorship.find({ 'communications.deletionId': deletionId });
    for (const sponsorship of sponsorshipsWithComm) {
      for (const comm of sponsorship.communications) {
        if (comm.deletionId === deletionId && comm.userInfo && comm.userInfo.userId) {
          comm.createdBy = comm.userInfo.userId;
          comm.userInfo = undefined;
          comm.isUserDeleted = false;
          comm.deletionId = undefined;
        }
      }
      await sponsorship.save();
    }
    
    // Restore sponsorship documents
    const sponsorshipsWithDocs = await Sponsorship.find({ 'documents.deletionId': deletionId });
    for (const sponsorship of sponsorshipsWithDocs) {
      for (const doc of sponsorship.documents) {
        if (doc.deletionId === deletionId && doc.userInfo && doc.userInfo.userId) {
          doc.uploadedBy = doc.userInfo.userId;
          doc.userInfo = undefined;
          doc.isUserDeleted = false;
          doc.deletionId = undefined;
        }
      }
      await sponsorship.save();
    }
    
    // 6. Restore Sponsorship Intents
    const intents = await SponsorshipIntent.find({ 'review.deletionId': deletionId });
    for (const intent of intents) {
      if (intent.review.deletionId === deletionId && intent.review.userInfo && intent.review.userInfo.userId) {
        intent.review.reviewedBy = intent.review.userInfo.userId;
        intent.review.userInfo = undefined;
        intent.review.isUserDeleted = false;
        intent.review.deletionId = undefined;
        await intent.save();
      }
    }
    
    // Restore intent communications
    const intentsWithComm = await SponsorshipIntent.find({ 'communications.deletionId': deletionId });
    for (const intent of intentsWithComm) {
      for (const comm of intent.communications) {
        if (comm.deletionId === deletionId && comm.userInfo && comm.userInfo.userId) {
          comm.createdBy = comm.userInfo.userId;
          comm.userInfo = undefined;
          comm.isUserDeleted = false;
          comm.deletionId = undefined;
        }
      }
      await intent.save();
    }
    
    // Restore intent documents
    const intentsWithDocs = await SponsorshipIntent.find({ 'documents.deletionId': deletionId });
    for (const intent of intentsWithDocs) {
      for (const doc of intent.documents) {
        if (doc.deletionId === deletionId && doc.userInfo && doc.userInfo.userId) {
          doc.uploadedBy = doc.userInfo.userId;
          doc.userInfo = undefined;
          doc.isUserDeleted = false;
          doc.deletionId = undefined;
        }
      }
      await intent.save();
    }
    
    // 7. Restore Receipts
    const receipts = await Receipt.find({ 'manualVerification.deletionId': deletionId });
    for (const receipt of receipts) {
      if (receipt.manualVerification.deletionId === deletionId && receipt.manualVerification.userInfo && receipt.manualVerification.userInfo.userId) {
        receipt.manualVerification.verifiedBy = receipt.manualVerification.userInfo.userId;
        receipt.manualVerification.userInfo = undefined;
        receipt.manualVerification.isUserDeleted = false;
        receipt.manualVerification.deletionId = undefined;
        await receipt.save();
      }
    }
    
    console.log(`✅ Successfully restored anonymized data for deletionId: ${deletionId}`);
    
  } catch (error) {
    console.error(`❌ Error restoring anonymized data for deletionId ${deletionId}:`, error);
    throw error;
  }
}

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Soft deletes a user account
 */
// Comprehensive account deletion that preserves all critical data
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 1. Check if this email has been deleted before
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // 2. Check for previous deletions of the same email
    const previousDeletions = await User.find({
      originalEmail: user.email,
      isDeleted: true
    }).sort({ deletedAt: -1 });
    
    // 3. Generate unique deletion ID for this instance
    const deletionId = `del_${Date.now()}_${userId.toString().slice(-8)}`;
    
    // 4. Soft delete the user account with enhanced tracking FIRST
    user.originalEmail = user.email;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletionId = deletionId; // Unique identifier for this deletion
    user.deletionSequence = previousDeletions.length + 1; // 1st, 2nd, 3rd deletion, etc.
    user.previousDeletionIds = previousDeletions.map(d => d.deletionId); // Track previous deletions
    
    // Store original authentication method for recovery
    user.originalAuthMethod = user.oauthProvider ? 'oauth' : 'password';
    if (user.oauthProvider) {
      user.originalOAuthProvider = user.oauthProvider;
      user.originalOAuthId = user.oauthId;
    }
    
    // Generate placeholder email to maintain unique constraint
    const timestamp = Date.now();
    const randomId = user._id.toString().slice(-12);
    user.email = `deleted_${timestamp}_${randomId}@deleted.envibuddies.invalid`;
    
    // Clear sensitive fields
    user.password = undefined;
    user.oauthProvider = 'google'; // Use a valid enum value to bypass password requirement
    user.oauthId = 'deleted_' + userId.toString().slice(-8);
    user.oauthPicture = undefined;
    user.recoveryToken = undefined;
    user.recoveryTokenExpires = undefined;
    
    // Since we're setting oauthProvider, dateOfBirth and gender become optional
    // But we'll keep them if they exist to maintain data integrity
    
    // 5. Save the user FIRST to ensure it's properly marked as deleted
    await user.save();
    console.log(`✅ User ${userId} marked as deleted successfully`);
    
    // 6. NOW anonymize all user's data across the system
    try {
      await anonymizeUserData(userId, deletionId, user); // Pass originalUserData
      console.log(`✅ Data anonymization completed for user ${userId}`);
    } catch (anonymizeError) {
      console.error(`❌ Error during data anonymization for user ${userId}:`, anonymizeError);
      // Continue with deletion even if anonymization fails
    }
    
    // 7. Create deletion history record
    try {
      await createDeletionHistory(user, previousDeletions);
    } catch (historyError) {
      console.error('Error creating deletion history:', historyError);
      // Don't fail deletion if history creation fails
    }
    
    res.json({ 
      message: 'Account deleted successfully. All your data has been preserved but anonymized.',
      note: `You can recover your account within 7 days using your original email. This is deletion #${user.deletionSequence} for this email.`,
      deletionId: deletionId
    });
    
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
};

// Handle account recreation scenarios
exports.handleAccountRecreation = async (req, res) => {
  try {
    const { email } = req.body;
    
    // 1. Find all deleted accounts with this email
    const deletedAccounts = await User.find({
      originalEmail: email,
      isDeleted: true
    }).sort({ deletedAt: -1 });
    
    if (deletedAccounts.length === 0) {
      return res.status(404).json({ 
        message: 'No deleted accounts found for this email',
        canCreateNew: true
      });
    }
    
    // 2. Check if there's an active account with this email
    const activeAccount = await User.findOne({
      email: email,
      isDeleted: false
    });
    
    if (activeAccount) {
      return res.status(409).json({
        message: 'An active account already exists with this email',
        canCreateNew: false,
        suggestion: 'Please use a different email or recover your deleted account'
      });
    }
    
    // 3. Provide detailed information about deleted accounts
    const deletionInfo = deletedAccounts.map(acc => ({
      deletionId: acc.deletionId,
      deletionSequence: acc.deletionSequence,
      deletedAt: acc.deletedAt,
      username: acc.username,
      role: acc.role,
              canRecover: acc.deletedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
    }));
    
    // 4. Determine the best course of action
    const latestDeletion = deletedAccounts[0];
    const canRecoverLatest = latestDeletion.deletedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    let recommendation = '';
    let canCreateNew = true;
    
    if (deletedAccounts.length === 1) {
      if (canRecoverLatest) {
        recommendation = 'You have one deleted account that can still be recovered. We recommend recovering it to preserve your data.';
        canCreateNew = false;
      } else {
        recommendation = 'Your previous account has expired and cannot be recovered. You can create a new account.';
        canCreateNew = true;
      }
    } else {
      if (canRecoverLatest) {
        recommendation = `You have ${deletedAccounts.length} deleted accounts. The most recent one can still be recovered. We recommend recovering it to preserve your latest data.`;
        canCreateNew = false;
      } else {
        recommendation = `You have ${deletedAccounts.length} deleted accounts, but all have expired. You can create a new account.`;
        canCreateNew = true;
      }
    }
    
    res.json({
      message: 'Account recreation analysis complete',
      deletedAccounts: deletionInfo,
      recommendation: recommendation,
      canCreateNew: canCreateNew,
      latestDeletionId: latestDeletion.deletionId,
      totalDeletions: deletedAccounts.length
    });
    
  } catch (error) {
    console.error('Error handling account recreation:', error);
    res.status(500).json({ message: 'Failed to analyze account recreation', error: error.message });
  }
};

/**
 * Sends a recovery email with a secure token
 */
const sendRecoveryEmail = async (email, token, deletionSequence) => {
  // Validate email parameter
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.error('❌ Invalid email parameter for recovery email:', email);
    throw new Error('Invalid email address for recovery email');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  console.log(`📧 Sending recovery email to: ${cleanEmail}`);
  
  // Validate environment variables
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD || !process.env.FRONTEND_URL) {
    console.error('❌ Missing required environment variables for email sending:');
    console.error('   EMAIL_USERNAME:', process.env.EMAIL_USERNAME ? '✅ Set' : '❌ Missing');
    console.error('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
    console.error('   FRONTEND_URL:', process.env.FRONTEND_URL ? '✅ Set' : '❌ Missing');
    throw new Error('Missing required environment variables for email sending');
  }

  const recoveryUrl = `${process.env.FRONTEND_URL}/recovery-confirmation?token=${token}`;
  
  const mailOptions = {
    from: `"EnviBuddies" <${process.env.EMAIL_USERNAME}>`,
    to: cleanEmail,
    subject: 'Account Recovery - EnviBuddies',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Recovery</h2>
        <p>We received a request to recover your EnviBuddies account. If you didn't make this request, you can safely ignore this email.</p>
        <p>To recover your account, please click the button below:</p>
        <div style="margin: 25px 0;">
          <a href="${recoveryUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Recover Account
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p>${recoveryUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
        <p>This recovery link is for deletion #${deletionSequence}.</p>
      </div>
    `,
  };

  try {
    console.log(`📤 Attempting to send email to: ${cleanEmail}`);
  await transporter.sendMail(mailOptions);
    console.log(`✅ Recovery email sent successfully to: ${cleanEmail}`);
  } catch (error) {
    console.error('❌ Failed to send recovery email:', error);
    throw error;
  }
};

/**
 * Initiates account recovery by sending a recovery email
 */
// Enhanced recovery request with deletion history
exports.requestAccountRecovery = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email input
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ 
        message: 'Valid email address is required',
        error: 'EMAIL_REQUIRED'
      });
    }
    
    const cleanEmail = email.trim().toLowerCase();
    console.log(`🔍 Recovery requested for email: ${cleanEmail}`);
    
    // 1. Find all deleted accounts with this email
    const deletedAccounts = await User.find({
      originalEmail: cleanEmail,
      isDeleted: true
    }).sort({ deletedAt: -1 });
    
    console.log(`📊 Found ${deletedAccounts.length} deleted accounts for ${cleanEmail}`);
    
    if (deletedAccounts.length === 0) {
      return res.status(404).json({ 
        message: 'No deleted accounts found for this email',
        suggestion: 'You can create a new account with this email'
      });
    }
    
    // 2. Check if there's an active account
    const activeAccount = await User.findOne({
      email: cleanEmail,
      isDeleted: false
    });
    
    if (activeAccount) {
      return res.status(409).json({
        message: 'An active account already exists with this email',
        suggestion: 'Please use a different email or recover your deleted account'
      });
    }
    
    // 3. Find the most recent deletable account (within 7 days)
    const recoverableAccount = deletedAccounts.find(acc => 
      acc.deletedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (!recoverableAccount) {
      return res.status(410).json({
        message: 'All deleted accounts for this email have expired and cannot be recovered',
        suggestion: 'You can create a new account with this email',
        expiredAccounts: deletedAccounts.length
      });
    }
    
    console.log(`✅ Found recoverable account: ${recoverableAccount.username} (${recoverableAccount._id})`);
    console.log(`📧 Original email: ${recoverableAccount.originalEmail}`);
    
    // 4. Generate recovery token for the most recent account
    // Ensure token uniqueness by checking if it already exists
    let recoveryToken;
    let tokenExists = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (tokenExists && attempts < maxAttempts) {
      recoveryToken = crypto.randomBytes(32).toString('hex');
      
      // Check if this token already exists
      const existingToken = await User.findOne({ recoveryToken });
      if (!existingToken) {
        tokenExists = false;
      } else {
        attempts++;
        console.log(`⚠️ Recovery token collision detected, generating new token (attempt ${attempts})`);
      }
    }
    
    if (tokenExists) {
      console.error('❌ Failed to generate unique recovery token after multiple attempts');
      return res.status(500).json({ 
        message: 'Failed to generate recovery token. Please try again.',
        error: 'TOKEN_GENERATION_FAILED'
      });
    }
    
    recoverableAccount.recoveryToken = recoveryToken;
    recoverableAccount.recoveryTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await recoverableAccount.save();
    console.log(`🔑 Recovery token generated: ${recoveryToken.substring(0, 8)}... (${attempts} collision attempts)`);
    
    // 5. Send recovery email - use the clean email from request, not originalEmail
    await sendRecoveryEmail(cleanEmail, recoveryToken, recoverableAccount.deletionSequence);
    
    res.json({
      message: `Recovery email sent for deletion #${recoverableAccount.deletionSequence}`,
              note: `This will recover your most recent deleted account (deleted on ${recoverableAccount.deletedAt.toLocaleDateString('en-GB')})`,
      totalDeletedAccounts: deletedAccounts.length,
      canRecover: true
    });
    
  } catch (error) {
    console.error('Error requesting account recovery:', error);
    res.status(500).json({ message: 'Failed to send recovery email', error: error.message });
  }
};

// Helper function to get user ID from recovery token
async function getUserIdFromToken(token) {
  try {
    const user = await User.findOne({ recoveryToken: token }).select('_id');
    return user?._id || null;
  } catch (error) {
    console.error('Error getting user ID from token:', error);
    return null;
  }
}

// Simple in-memory lock for recovery tokens (for single server instance)
const recoveryLocks = new Map();

// Helper function to acquire/release recovery lock
async function acquireRecoveryLock(token, requestId) {
  if (recoveryLocks.has(token)) {
    console.log(`🔒 [${requestId}] Token ${token.substring(0, 8)}... is already locked`);
    return false;
  }
  
  recoveryLocks.set(token, requestId);
  console.log(`🔒 [${requestId}] Lock acquired for token ${token.substring(0, 8)}...`);
  return true;
}

function releaseRecoveryLock(token, requestId) {
  if (recoveryLocks.has(token)) {
    recoveryLocks.delete(token);
    console.log(`🔓 [${requestId}] Lock released for token ${token.substring(0, 8)}...`);
  }
}

/**
 * Recovers a soft-deleted account using a valid recovery token
 */
// Enhanced account recovery with deletion history
exports.recoverAccount = async (req, res) => {
  // Add unique request ID to track duplicate calls - define it at the top level
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  let lockAcquired = false;
  let token = null;
  
  try {
    console.log(`🚀 [${requestId}] Recovery request started`);
    console.log(`🚀 [${requestId}] Recovery request body:`, req.body);
    console.log(`🚀 [${requestId}] Recovery request headers:`, req.headers);
    
    token = req.body.token;
    
    if (!token) {
      console.error(`❌ [${requestId}] No token provided in request body`);
      return res.status(400).json({ 
        message: 'Recovery token is required',
        error: 'MISSING_TOKEN'
      });
    }
    
    console.log(`🔄 [${requestId}] Attempting to recover account with token: ${token.substring(0, 8)}...`);
    
    // 1. Simple in-memory locking to prevent race conditions
    console.log(`🔍 [${requestId}] Attempting to acquire recovery lock for token: ${token.substring(0, 8)}...`);
    
    // Try to acquire the lock first
    if (!await acquireRecoveryLock(token, requestId)) {
      console.log(`❌ [${requestId}] Failed to acquire recovery lock - another request is processing this token`);
      return res.status(429).json({ 
        message: 'Account recovery is already in progress. Please wait.',
        error: 'RECOVERY_IN_PROGRESS'
      });
    }
    
    lockAcquired = true;
    console.log(`🔒 [${requestId}] Lock successfully acquired, proceeding with recovery...`);
    
    // Now find the user with the recovery token
    const user = await User.findOne({
      recoveryToken: token,
      recoveryTokenExpires: { $gt: new Date() },
      isDeleted: true
    }).select('+recoveryToken +recoveryTokenExpires +originalEmail +originalAuthMethod +originalOAuthProvider +originalOAuthId');
    
    if (!user) {
      console.log(`❌ [${requestId}] No user found with valid recovery token`);
      return res.status(400).json({ 
        message: 'Invalid or expired recovery token',
        error: 'TOKEN_INVALID'
      });
    }
    
    // Check if token was already used
    if (user.recoveryTokenUsed) {
      console.log(`❌ [${requestId}] Recovery token already used for user: ${user._id}`);
      return res.status(400).json({ 
        message: 'This recovery token has already been used',
        error: 'TOKEN_ALREADY_USED'
      });
    }
    
    console.log(`🔒 [${requestId}] Recovery lock acquired for user: ${user._id}`);
    
    // Double-check: verify no other users have this recovery token
    const duplicateTokenCheck = await User.find({
      recoveryToken: token,
      _id: { $ne: user._id }
    });
    
    if (duplicateTokenCheck.length > 0) {
      console.error(`❌ [${requestId}] CRITICAL: Found ${duplicateTokenCheck.length} other users with the same recovery token!`);
      duplicateTokenCheck.forEach(dupUser => {
        console.error(`❌ [${requestId}] Duplicate token user: ${dupUser._id} - ${dupUser.email}`);
      });
    } else {
      console.log(`✅ [${requestId}] No duplicate recovery tokens found`);
    }

    console.log(`✅ [${requestId}] Found user for recovery: ${user.username} (${user._id})`);
    console.log(`📧 [${requestId}] Original email: ${user.originalEmail}`);
    console.log(`📧 [${requestId}] Current email: ${user.email}`);
    console.log(`📱 [${requestId}] Phone: ${user.phone}`);
    console.log(`👤 [${requestId}] Role: ${user.role}`);
    console.log(`🎂 [${requestId}] Date of Birth: ${user.dateOfBirth || 'Not set'}`);
    console.log(`⚧ [${requestId}] Gender: ${user.gender || 'Not set'}`);
    console.log(`🔐 [${requestId}] Original auth method: ${user.originalAuthMethod || 'Unknown'}`);
    console.log(`🔐 [${requestId}] Original OAuth provider: ${user.originalOAuthProvider || 'None'}`);
    
    // Validate that we have the original email
    if (!user.originalEmail) {
      console.error('❌ User missing originalEmail field:', user._id);
      return res.status(500).json({ 
        message: 'Account recovery failed: Missing original email information',
        error: 'MISSING_ORIGINAL_EMAIL'
      });
    }
    
    // Validate that we have the phone field
    if (!user.phone) {
      console.error('❌ User missing phone field:', user._id);
      return res.status(500).json({ 
        message: 'Account recovery failed: Missing phone information',
        error: 'MISSING_PHONE'
      });
    }
    
    // Validate that we have the name field
    if (!user.name) {
      console.error('❌ User missing name field:', user._id);
      return res.status(500).json({ 
        message: 'Account recovery failed: Missing name information',
        error: 'MISSING_NAME'
      });
    }
    
    // 2. Check for conflicts with active accounts
    const activeAccount = await User.findOne({
      email: user.originalEmail,
      isDeleted: false
    });
    
    if (activeAccount) {
      console.log(`⚠️  Active account conflict found: ${activeAccount.username}`);
      return res.status(409).json({
        message: 'Cannot recover account: An active account already exists with this email',
        suggestion: 'Please delete the active account first, or use a different email for recovery'
      });
    }
    
    // 3. Restore the account
    console.log(`🔄 Restoring account for email: ${user.originalEmail}`);
    
    user.email = user.originalEmail;
    user.isDeleted = false;
    user.deletedAt = undefined;
    user.recoveryToken = undefined;
    user.recoveryTokenExpires = undefined;
    user.recoveryTokenUsed = true; // Mark token as used to prevent duplicate recovery
    user.recoveryInProgress = false; // Clear the progress flag
    
    console.log(`🔒 [${requestId}] Clearing recovery token and marking as used for user: ${user._id}`);
    
    // Restore original authentication method
    // During deletion, we temporarily set oauthProvider to bypass validation
    // Now we need to restore the original state
    let generatedPassword = null;
    
    if (user.originalAuthMethod === 'oauth' && user.originalOAuthProvider && user.originalOAuthId && !user.originalOAuthId.startsWith('deleted_')) {
      // This was a real OAuth account, keep it
      user.oauthProvider = user.originalOAuthProvider;
      user.oauthId = user.originalOAuthId;
      user.oauthPicture = undefined; // Clear picture if it was a temporary deletion
      console.log(`🔄 Kept OAuth authentication: ${user.oauthProvider}`);
      console.log(`✅ OAuth account - dateOfBirth and gender are optional`);
      console.log(`📧 Will send OAuth recovery email to: ${user.email}`);
    } else {
      // This was a password-based account (or temporary OAuth during deletion)
      // First, clear OAuth fields to make password required
      user.oauthProvider = undefined;
      user.oauthId = undefined;
      user.oauthPicture = undefined;
      
      // Now generate and set the password
      const crypto = require('crypto');
      generatedPassword = crypto.randomBytes(8).toString('hex'); // 16 character hex password
      const bcrypt = require('bcryptjs');
      user.password = bcrypt.hashSync(generatedPassword, 10);
      
      console.log(`🔄 [${requestId}] Restored to password-based authentication with new password: ${generatedPassword}`);
      console.log(`🔐 [${requestId}] Password hash stored: ${user.password.substring(0, 20)}...`);
      console.log(`⚠️ [${requestId}] Password-based account - checking required fields (dateOfBirth: ${!!user.dateOfBirth}, gender: ${!!user.gender})`);
      console.log(`📧 [${requestId}] Will send password recovery email to: ${user.email}`);
    }
    
    // Keep deletionId and deletionSequence for historical tracking
    
    // Log the user state before saving for debugging
    console.log(`🔍 User state before save:`, {
      name: !!user.name,
      username: !!user.username,
      email: !!user.email,
      phone: !!user.phone,
      role: !!user.role,
      oauthProvider: user.oauthProvider,
      dateOfBirth: !!user.dateOfBirth,
      gender: !!user.gender,
      password: !!user.password
    });
    
    // Final validation: ensure all required fields are present
    if (!user.name || !user.username || !user.email || !user.phone || !user.role) {
      console.error('❌ Missing required fields for account recovery:', {
        name: !!user.name,
        username: !!user.username,
        email: !!user.email,
        phone: !!user.phone,
        role: !!user.role
      });
      return res.status(500).json({ 
        message: 'Account recovery failed: Missing required fields',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // For password-based users, ensure password is present and valid
    if (!user.oauthProvider && !user.password) {
      console.error('❌ Missing password for password-based user');
      return res.status(500).json({ 
        message: 'Account recovery failed: Password not set for password-based account',
        error: 'MISSING_PASSWORD'
      });
    }
    
    if (!user.oauthProvider && user.password) {
      // Verify password hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
        console.error('❌ Invalid password hash format:', user.password.substring(0, 10));
        return res.status(500).json({ 
          message: 'Account recovery failed: Invalid password format',
          error: 'INVALID_PASSWORD_FORMAT'
        });
      }
      console.log(`✅ Password hash format is valid: ${user.password.substring(0, 7)}...`);
    }
    
    // For password-based users, ensure dateOfBirth and gender are present
    if (!user.oauthProvider && (!user.dateOfBirth || !user.gender)) {
      console.error('❌ Missing required fields for password-based user:', {
        dateOfBirth: !!user.dateOfBirth,
        gender: !!user.gender
      });
      
      const missingFields = [];
      if (!user.dateOfBirth) missingFields.push('Date of Birth');
      if (!user.gender) missingFields.push('Gender');
      
      return res.status(500).json({ 
        message: `Account recovery failed: Missing required profile fields for password-based account: ${missingFields.join(', ')}. Please contact support.`,
        error: 'MISSING_PROFILE_FIELDS',
        missingFields: missingFields,
        note: 'Password-based accounts require Date of Birth and Gender. OAuth accounts can have these fields empty.'
      });
    }
    
    // For OAuth users, these fields are optional, so we don't validate them
    if (user.oauthProvider) {
      console.log(`✅ OAuth user - dateOfBirth and gender are optional`);
    }
    
    try {
      // Log the user object before save
      console.log(`🔍 User object before save:`, {
        _id: user._id,
        email: user.email,
        oauthProvider: user.oauthProvider,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
        passwordStartsWith: user.password ? user.password.substring(0, 10) : 'N/A'
      });
      
      await user.save();
      console.log(`✅ Account restored successfully: ${user.email}`);
    } catch (saveError) {
      console.error('❌ Error saving user during recovery:', saveError);
      if (saveError.name === 'ValidationError') {
        console.error('❌ Validation errors:', saveError.errors);
        console.error('❌ Validation error details:', JSON.stringify(saveError.errors, null, 2));
      }
      throw saveError;
    }
    
    // Verify password was saved correctly
    if (!user.oauthProvider) {
      // Try multiple ways to retrieve the password
      const savedUser1 = await User.findById(user._id).select('+password');
      const savedUser2 = await User.findById(user._id);
      
      console.log(`🔐 Password verification after save:`);
      console.log(`🔐 Method 1 (select +password): ${savedUser1.password ? 'Password hash present' : 'Password hash missing'}`);
      console.log(`🔐 Method 2 (no select): ${savedUser2.password ? 'Password hash present' : 'Password hash missing'}`);
      
      // Use the method that has the password
      const savedUser = savedUser1.password ? savedUser1 : savedUser2;
      
      if (savedUser.password) {
        console.log(`🔐 Password hash starts with: ${savedUser.password.substring(0, 20)}...`);
        console.log(`🔐 Full password hash: ${savedUser.password}`);
        
        // Test password verification
        const bcrypt = require('bcryptjs');
        const isPasswordValid = bcrypt.compareSync(generatedPassword, savedUser.password);
        console.log(`🔐 Password verification test: ${isPasswordValid ? 'PASSED' : 'FAILED'}`);
        
        if (!isPasswordValid) {
          console.error('❌ CRITICAL: Generated password does not match stored hash!');
          console.error(`❌ Generated password: ${generatedPassword}`);
          console.error(`❌ Stored hash: ${savedUser.password}`);
          
          // Try to debug the issue by checking if the password was modified
          console.error(`🔍 Debug: User object password field: ${user.password}`);
          console.error(`🔍 Debug: User object oauthProvider: ${user.oauthProvider}`);
        }
      } else {
        console.error('❌ CRITICAL: Password field is missing from both query methods!');
        console.error(`🔍 Debug: User object password field: ${user.password}`);
        console.error(`🔍 Debug: User object oauthProvider: ${user.oauthProvider}`);
      }
    }
    
    // Log summary of what was restored
    console.log(`📋 Recovery Summary:`, {
      accountType: user.oauthProvider ? 'OAuth' : 'Password-based',
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      dateOfBirth: user.dateOfBirth ? 'Present' : 'Not set',
      gender: user.gender ? 'Present' : 'Not set',
      hasPassword: !!user.password,
      oauthProvider: user.oauthProvider || 'None'
    });
    
    // 4. Restore all anonymized data
    if (user.deletionId) {
      console.log(`🔄 Restoring anonymized data for deletionId: ${user.deletionId}`);
      await restoreAnonymizedData(user.deletionId);
      console.log(`✅ Data restoration completed`);
    } else {
      console.log(`⚠️  No deletionId found, skipping data restoration`);
    }
    
    // 5. Send appropriate email based on account type
    if (user.oauthProvider) {
      // For OAuth users, send a welcome back email
      try {
        await sendOAuthRecoveryEmail(user.email, user.name, user.oauthProvider);
        console.log(`📧 OAuth recovery email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send OAuth recovery email:', emailError);
        // Don't fail the recovery if email fails
      }
    } else if (generatedPassword) {
      // For password-based users, send password recovery email
      console.log(`📧 [${requestId}] Sending password recovery email with password: ${generatedPassword}`);
      
      // Double-check the password is still valid before sending email
      const currentUser = await User.findById(user._id).select('+password');
      if (currentUser && currentUser.password) {
        const bcrypt = require('bcryptjs');
        const isStillValid = bcrypt.compareSync(generatedPassword, currentUser.password);
        console.log(`🔐 [${requestId}] Password verification before email: ${isStillValid ? 'VALID' : 'INVALID'}`);
        if (!isStillValid) {
          console.error(`❌ [${requestId}] CRITICAL: Password became invalid before email sending!`);
          console.error(`❌ [${requestId}] Generated password: ${generatedPassword}`);
          console.error(`❌ [${requestId}] Stored hash: ${currentUser.password}`);
        }
      }
      
      try {
        await sendPasswordRecoveryEmail(user.email, generatedPassword, user.name);
        console.log(`📧 [${requestId}] Password recovery email sent to: ${user.email}`);
      } catch (emailError) {
        console.error(`⚠️ [${requestId}] Failed to send password recovery email:`, emailError);
        // Don't fail the recovery if email fails
      }
    }
    
    console.log(`🎉 [${requestId}] Account recovery completed successfully for: ${user.email}`);
    console.log(`📧 [${requestId}] Email sent: ${user.oauthProvider ? 'OAuth recovery email' : 'Password recovery email'}`);
    
    const responseData = {
      message: 'Account recovered successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role
      },
      note: `Recovered deletion #${user.deletionSequence} for email ${user.email}`,
      passwordNote: generatedPassword ? 'A new password has been generated and sent to your email. Please use it to login and change it immediately.' : null,
      oauthNote: user.oauthProvider ? `A welcome back email has been sent to your email. You can login using your ${user.oauthProvider} account.` : null,
      accountType: user.oauthProvider ? 'OAuth' : 'Password-based',
      hasProfileFields: {
        dateOfBirth: !!user.dateOfBirth,
        gender: !!user.gender
      }
    };
    
    // Clear the recovery token and mark as used on successful completion
    try {
      await User.findByIdAndUpdate(user._id, { 
        recoveryToken: undefined,
        recoveryTokenExpires: undefined,
        recoveryTokenUsed: true
      });
      console.log(`🔓 [${requestId}] Recovery token cleared on success for user: ${user._id}`);
      
      // Verify the cleanup
      const cleanupCheck = await User.findById(user._id).select('+recoveryToken +recoveryTokenExpires +recoveryTokenUsed');
      console.log(`🔍 [${requestId}] Cleanup verification:`, {
        recoveryToken: cleanupCheck.recoveryToken,
        recoveryTokenExpires: cleanupCheck.recoveryTokenExpires,
        recoveryTokenUsed: cleanupCheck.recoveryTokenUsed
      });
    } catch (lockError) {
      console.error(`❌ [${requestId}] Failed to clear recovery token on success:`, lockError);
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error recovering account:`, error);
    
    // Note: The recovery lock will be released in the finally block
    console.log(`❌ [${requestId}] Error occurred during recovery, lock will be released automatically`);
    
    res.status(500).json({ message: 'Failed to recover account', error: error.message });
  } finally {
    // Always release the recovery lock when the function completes
    if (lockAcquired && token) {
      releaseRecoveryLock(token, requestId);
      console.log(`🔓 [${requestId}] Recovery lock released in finally block`);
    }
  }
};

/**
 * Recovers a soft-deleted account by email
 */
exports.recoverAccountByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find a deleted user with this email
    const user = await User.findOne({
      originalEmail: email,
      isDeleted: true
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'No deleted account found with this email'
      });
    }
    
    // Check if the email is already in use by an active account
    const emailInUse = await User.findOne({
      email: user.originalEmail,
      isDeleted: { $ne: true },
      _id: { $ne: user._id }
    });
    
    if (emailInUse) {
      return res.status(400).json({
        success: false,
        message: 'This email is already in use by another account'
      });
    }
    
    // Restore the account
    user.email = user.originalEmail;
    user.originalEmail = undefined;
    user.isDeleted = false;
    user.deletedAt = undefined;
    
    await user.save();
    
    // TODO: Send welcome back email
    
    res.json({
      success: true,
      message: 'Account recovered successfully',
      userId: user._id
    });
    
  } catch (error) {
    console.error('Error recovering account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error recovering account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Permanently deletes accounts that were soft-deleted more than X days ago
 */
exports.cleanupDeletedAccounts = async (req, res) => {
  try {
    const retentionDays = parseInt(process.env.ACCOUNT_RETENTION_DAYS) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Find users to delete
    const usersToDelete = await User.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate }
    });
    
    const userIds = usersToDelete.map(u => u._id);
    
    // Delete the users
    const result = await User.deleteMany({
      _id: { $in: userIds }
    });
    
    // TODO: Delete associated files, etc.
    
    res.json({
      success: true,
      message: `Permanently deleted ${result.deletedCount} accounts`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error cleaning up deleted accounts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cleaning up deleted accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export helper functions for testing purposes
exports.anonymizeUserData = anonymizeUserData;
exports.restoreAnonymizedData = restoreAnonymizedData;
exports.createDeletionHistory = createDeletionHistory;

/**
 * Send password recovery email to user
 */
async function sendPasswordRecoveryEmail(email, newPassword, userName) {
  try {
    console.log(`📧 Email function called with password: ${newPassword}`);
    console.log(`📧 Email function called with email: ${email}`);
    console.log(`📧 Email function called with userName: ${userName}`);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content
    const mailOptions = {
      from: `"EnviBuddies" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: '🔑 Your New Password - Account Recovery Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0; font-size: 28px;">🎉 Account Recovery Successful!</h1>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello <strong>${userName}</strong>,
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your account has been successfully recovered. We've generated a new secure password for you to access your account.
            </p>
            
            <div style="background-color: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px;">🔑 Your New Password</h2>
              <div style="background-color: #ffffff; border: 1px solid #2196f3; border-radius: 6px; padding: 15px; margin: 10px 0;">
                <code style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #1976d2; letter-spacing: 2px;">${newPassword}</code>
              </div>
              <p style="color: #1976d2; font-size: 14px; margin: 10px 0 0 0;">
                <strong>Important:</strong> Copy this password and use it to login
              </p>
            </div>
            
            <div style="background-color: #fff3e0; border: 1px solid #ff9800; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #f57c00; margin: 0 0 10px 0; font-size: 16px;">⚠️ Security Notice</h3>
              <ul style="color: #e65100; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Use this password to login to your account</li>
                <li>Change your password immediately after logging in</li>
                <li>Do not share this password with anyone</li>
                <li>This password is temporary and should be changed</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="/login" 
                 style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                🚀 Login to Your Account
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                If you didn't request this account recovery, please contact our support team immediately.
              </p>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
                This email was sent to ${email}
              </p>
            </div>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Password recovery email sent successfully to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password recovery email:', error);
    throw error;
  }
}

/**
 * Send OAuth account recovery email to user
 */
async function sendOAuthRecoveryEmail(email, userName, oauthProvider) {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content
    const mailOptions = {
      from: `"EnviBuddies" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: '🎉 Welcome Back - OAuth Account Recovery Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0; font-size: 28px;">🎉 Account Recovery Successful!</h1>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello <strong>${userName}</strong>,
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your OAuth account has been successfully recovered. You can now login using your ${oauthProvider} account as usual.
            </p>
            
            <div style="background-color: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px;">🔐 Login with OAuth</h2>
              <p style="color: #1976d2; font-size: 16px; margin: 0;">
                Since you created your account using ${oauthProvider}, you can login directly with your ${oauthProvider} account.
              </p>
              <p style="color: #1976d2; font-size: 14px; margin: 10px 0 0 0;">
                <strong>No password needed!</strong> Just click the ${oauthProvider} login button.
              </p>
            </div>
            
            <div style="background-color: #fff3e0; border: 1px solid #ff9800; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #f57c00; margin: 0 0 10px 0; font-size: 16px;">ℹ️ What Happened</h3>
              <ul style="color: #e65100; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Your account was temporarily deleted but has been restored</li>
                <li>All your data, events, and messages are preserved</li>
                <li>You can login using your ${oauthProvider} account</li>
                <li>No password changes are needed</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="/login" 
                 style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                🚀 Login with ${oauthProvider}
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                If you didn't request this account recovery, please contact our support team immediately.
              </p>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
                This email was sent to ${email}
              </p>
            </div>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OAuth recovery email sent successfully to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OAuth recovery email:', error);
    throw error;
  }
}
