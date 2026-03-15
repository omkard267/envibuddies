const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Organization = require("../models/organization");
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (userId, deviceInfo = 'unknown', ipAddress = 'unknown') => {
  const tokenId = crypto.randomBytes(16).toString('hex');
  const payload = { 
    id: userId, 
    tokenId,
    deviceInfo,
    ipAddress,
    type: 'access'
  };
  
  return {
    accessToken: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" }),
    refreshToken: jwt.sign({ id: userId, tokenId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: "7d" }),
    tokenId
  };
};

const generateRefreshToken = (userId, tokenId) => {
  return jwt.sign({ id: userId, tokenId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Volunteer Signup
exports.signupVolunteer = async (req, res) => {
  try {

    const {
      name,
      username,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      phone,
      interests,
      gender,
      city
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if email already exists in active accounts
    const existingEmail = await User.findOne({
      email,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check for recently deleted accounts with same email (within 7 days)
    // Check both email and originalEmail fields since deleted accounts store original email in originalEmail
    const recentlyDeletedAccount = await User.findOne({
      $or: [
        { email, isDeleted: true },
        { originalEmail: email, isDeleted: true }
      ],
      deletedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within 7 days
    });

    if (recentlyDeletedAccount) {
      // Calculate remaining recovery time
      const recoveryDeadline = new Date(recentlyDeletedAccount.deletedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const remainingTime = Math.ceil((recoveryDeadline - now) / (24 * 60 * 60 * 1000));
      
      return res.status(409).json({
        message: "🚫 This email address is temporarily blocked for 7 days due to a recently deleted account",
        errorType: "RECENTLY_DELETED_ACCOUNT",
        deletedAccount: {
          username: recentlyDeletedAccount.username,
          name: recentlyDeletedAccount.name,
          role: recentlyDeletedAccount.role,
          deletedAt: recentlyDeletedAccount.deletedAt,
          deletionSequence: recentlyDeletedAccount.deletionSequence,
          canRecover: recentlyDeletedAccount.deletionId ? true : false
        },
        suggestion: `You can recover your deleted account within ${remainingTime} days, or wait until ${recoveryDeadline.toLocaleDateString()} to use this email for a new account.`,
        recoveryDeadline: recoveryDeadline,
        remainingDays: remainingTime
      });
    }

    // Check if username already exists in active accounts
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Enhanced password validation
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'password123', 'admin123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({ message: "This is a commonly used password. Please choose a more unique password." });
    }

    // Check password strength requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const interestsArray = Array.isArray(interests)
      ? interests
      : typeof interests === 'string'
      ? [interests]
      : [];

    const userData = {
      name,
      username: username.toLowerCase(),
      email,
      phone,
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      city,
      role: "volunteer",
      isEmailVerified: false,
      isPhoneVerified: false,
      // Explicitly set OAuth fields to undefined to avoid null issues with the index
      oauthProvider: undefined,
      oauthId: undefined
    };

    const user = new User(userData);

    // Handle profile image upload to Cloudinary
    let profileImageUrl = null;
    
    // Check for pre-uploaded Cloudinary URL (from frontend)
    if (req.body.profileImageUrl) {
      profileImageUrl = req.body.profileImageUrl;
      user.profileImage = profileImageUrl;
    }
    // Fallback: Handle direct file upload
    else if (req.files?.profileImage?.[0]) {
      const { uploadToCloudinary } = require('../utils/cloudinaryUtils');
      const uploadResult = await uploadToCloudinary(req.files.profileImage[0], 'profiles');
      
      if (uploadResult.success) {
        profileImageUrl = uploadResult.url;
        user.profileImage = profileImageUrl;
      } else {
        console.error('Profile image upload failed:', uploadResult.error);
        return res.status(500).json({ message: 'Failed to upload profile image' });
      }
    }

    await user.save();

    res.status(201).json({ 
      message: "Volunteer account created successfully. Please login to continue.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profileImage: user.profileImage || null
      }
    });
  } catch (err) {
    console.error("❌ Volunteer Signup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Organizer Signup
exports.signupOrganizer = async (req, res) => {
  try {

    const {
      name,
      username,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      phone,
      gender,
      city,
      organization,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Enhanced password validation
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'password123', 'admin123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({ message: "This is a commonly used password. Please choose a more unique password." });
    }

    // Check password strength requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
      });
    }

    // Check if email already exists in active accounts
    const existingEmail = await User.findOne({
      email,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    
    if (existingEmail) {
      console.warn(`⚠️ Email already exists: ${email}`, {
        existingUserId: existingEmail._id,
        existingUserRole: existingEmail.role,
        oauthProvider: existingEmail.oauthProvider,
        oauthId: existingEmail.oauthId
      });
      return res.status(400).json({ 
        message: "Email already exists",
        errorType: 'EMAIL_EXISTS',
        existingUser: {
          id: existingEmail._id,
          role: existingEmail.role,
          oauthProvider: existingEmail.oauthProvider
        }
      });
    }

    // Check for recently deleted accounts with same email (within 7 days)
    // Check both email and originalEmail fields since deleted accounts store original email in originalEmail
    console.log(`🔍 [ORGANIZER_SIGNUP] Checking for recently deleted accounts with email: ${email}`);
    
    const recentlyDeletedAccount = await User.findOne({
      $or: [
        { email, isDeleted: true },
        { originalEmail: email, isDeleted: true }
      ],
      deletedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within 7 days
    });

    if (recentlyDeletedAccount) {
      console.log(`🚫 [ORGANIZER_SIGNUP] Found recently deleted account for email: ${email}`, {
        deletedAt: recentlyDeletedAccount.deletedAt,
        originalEmail: recentlyDeletedAccount.originalEmail,
        currentEmail: recentlyDeletedAccount.email,
        deletionId: recentlyDeletedAccount.deletionId
      });
      
      // Calculate remaining recovery time
      const recoveryDeadline = new Date(recentlyDeletedAccount.deletedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const remainingTime = Math.ceil((recoveryDeadline - now) / (24 * 60 * 60 * 1000));
      
      console.log(`⏰ [ORGANIZER_SIGNUP] Recovery window: ${remainingTime} days remaining until ${recoveryDeadline.toISOString()}`);
      
      return res.status(409).json({
        message: "🚫 This email address is temporarily blocked for 7 days due to a recently deleted account",
        errorType: "RECENTLY_DELETED_ACCOUNT",
        deletedAccount: {
          username: recentlyDeletedAccount.username,
          name: recentlyDeletedAccount.name,
          role: recentlyDeletedAccount.role,
          deletedAt: recentlyDeletedAccount.deletedAt,
          deletionSequence: recentlyDeletedAccount.deletionSequence,
          canRecover: recentlyDeletedAccount.deletionId ? true : false
        },
        suggestion: `You can recover your deleted account within ${remainingTime} days, or wait until ${recoveryDeadline.toLocaleDateString()} to use this email for a new account.`,
        recoveryDeadline: recoveryDeadline,
        remainingDays: remainingTime
      });
    } else {
      console.log(`✅ [ORGANIZER_SIGNUP] No recently deleted accounts found for email: ${email} - proceeding with signup`);
    }

    // Check if username already exists in active accounts
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user data object with explicit undefined for OAuth fields
    const userData = {
      name,
      username: username.toLowerCase(),
      email,
      phone,
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      city,
      role: "organizer",
      isEmailVerified: false,
      isPhoneVerified: false,
      pendingApproval: true,
      oauthProvider: undefined,
      oauthId: undefined
    };

    // Only add organization if it's provided and not empty
    if (organization && organization.trim() !== "") {
      // Validate that organization is a valid ObjectId if provided
      if (mongoose.Types.ObjectId.isValid(organization)) {
        userData.organization = organization;
      } else {
        return res.status(400).json({ 
          message: "Invalid organization ID format",
          errorType: 'INVALID_ORGANIZATION_ID'
        });
      }
    }

    // Create and save the organizer
    const user = new User(userData);
    user.oauthProvider = undefined;
    user.oauthId = undefined;
    
    // Handle file uploads if any
    if (req.files || req.body.profileImageUrl || req.body.govtIdProofUrl) {
      // Handle profile image upload to Cloudinary
      if (req.body.profileImageUrl) {
        // Use pre-uploaded Cloudinary URL from frontend
        user.profileImage = req.body.profileImageUrl;
      } else if (req.files?.profileImage?.[0]) {
        // Fallback: Handle direct file upload
        const { uploadToCloudinary } = require('../utils/cloudinaryUtils');
        const uploadResult = await uploadToCloudinary(req.files.profileImage[0], 'profiles');
        
        if (uploadResult.success) {
          user.profileImage = uploadResult.url;
        } else {
          console.error('Profile image upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload profile image' });
        }
      }
      
      // Handle government ID proof upload to Cloudinary
      if (req.body.govtIdProofUrl) {
        // Use pre-uploaded Cloudinary URL from frontend
        user.govtIdProofUrl = req.body.govtIdProofUrl;
      } else if (req.files?.govtIdProof?.[0]) {
        // Fallback: Handle direct file upload
        const { uploadToCloudinary } = require('../utils/cloudinaryUtils');
        const uploadResult = await uploadToCloudinary(req.files.govtIdProof[0], 'documents');
        
        if (uploadResult.success) {
          user.govtIdProofUrl = uploadResult.url;
        } else {
          console.error('Government ID proof upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload government ID proof' });
        }
      }
    }
    
    await user.save();
    
    res.status(201).json({ 
      message: "Organizer account created successfully. Please login to continue.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profileImage: user.profileImage || null,
        govtIdProofUrl: user.govtIdProofUrl || null
      } 
    });
  } catch (err) {
    console.error("❌ Organizer Signup Error:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      keyPattern: err.keyPattern,
      keyValue: err.keyValue,
      response: err.response?.data
    });
    
    // Handle duplicate key errors specifically
    if (err.code === 11000) {
      console.error('🔑 Duplicate key error details:', {
        keyPattern: err.keyPattern,
        keyValue: err.keyValue
      });
      return res.status(400).json({ 
        message: 'This account already exists. Please try logging in instead.',
        errorType: 'DUPLICATE_ACCOUNT',
        duplicateFields: err.keyValue
      });
    }
    
    res.status(500).json({ 
      message: err.message,
      errorType: 'SERVER_ERROR'
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    // Check if account is locked
    const user = await User.findOne({ email }).select('+password +loginAttempts +accountLockedUntil');
    
    if (!user) {
      console.warn("⚠️ Login failed — user not found:", email);
      return res.status(400).json({ 
        message: "Email not found",
        errorCode: "EMAIL_NOT_FOUND",
        errorType: "AUTHENTICATION_ERROR"
      });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const lockoutTime = Math.ceil((user.accountLockedUntil - new Date()) / 1000 / 60);
      return res.status(423).json({ 
        message: `Account is temporarily locked. Please try again in ${lockoutTime} minutes.`,
        lockoutUntil: user.accountLockedUntil
      });
    }

    // Check if user is OAuth-only (no password set)
    if (!user.password) {
      console.warn("⚠️ Login failed — OAuth user trying to login with password:", email);
      const oauthProvider = user.oauthProvider || 'OAuth';
      const providerName = oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1);
      
      return res.status(400).json({ 
        message: `This account was created with ${providerName}. Please use 'Sign in with ${providerName}' to login.`,
        oauthProvider: oauthProvider,
        isOAuthUser: true,
        errorCode: "OAUTH_ACCOUNT",
        errorType: "AUTHENTICATION_ERROR"
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (user.loginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();
        
        return res.status(423).json({ 
          message: "Too many failed login attempts. Account locked for 30 minutes.",
          lockoutUntil: user.accountLockedUntil
        });
      }
      
      await user.save();
      console.warn("⚠️ Login failed — incorrect password for:", email);
      return res.status(400).json({ 
        message: "Incorrect password",
        errorCode: "INVALID_PASSWORD",
        errorType: "AUTHENTICATION_ERROR"
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.accountLockedUntil = undefined;
    user.lastLoginAt = new Date();
    
    // Generate tokens with device info
    const tokens = generateToken(user._id, userAgent, ipAddress);
    
    // Store session info
    user.activeSessions.push({
      tokenId: tokens.tokenId,
      deviceInfo: userAgent,
      ipAddress: ipAddress,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    await user.save();

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.username,
      profileImage: user.profileImage || null,
      govtIdProofUrl: user.govtIdProofUrl || null
    };

    // Only include organization if it exists
    if (user.organization) {
      userResponse.organization = user.organization;
    }

    res.status(200).json({ 
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userResponse
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Set password for OAuth users
exports.setPassword = async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;

    if (!userId || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Enhanced password validation
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'password123', 'admin123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({ message: "This is a commonly used password. Please choose a more unique password." });
    }

    // Check password strength requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already has a password
    if (user.password) {
      return res.status(400).json({ message: "Password is already set for this account" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ 
      message: "Password set successfully. You can now login with email and password.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username
      }
    });

  } catch (err) {
    console.error("❌ Set Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Forgot Password - Send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email (only active accounts)
    const user = await User.findOne({ 
      email, 
      isDeleted: false 
    }).select('+resetPasswordAttempts +resetPasswordLockoutUntil');

    if (!user) {
      // Don't reveal if email exists or not
      return res.status(200).json({ 
        message: "If an account with this email exists, a password reset link has been sent." 
      });
    }

    // Check if user has a password (not OAuth-only)
    if (!user.password) {
      const oauthProvider = user.oauthProvider || 'OAuth';
      const providerName = oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1);
      
      return res.status(400).json({ 
        message: `This account was created with ${providerName}. Please use 'Sign in with ${providerName}' to login.`,
        oauthProvider: oauthProvider,
        isOAuthUser: true
      });
    }

    // Check rate limiting for password reset
    if (user.resetPasswordLockoutUntil && user.resetPasswordLockoutUntil > new Date()) {
      const lockoutTime = Math.ceil((user.resetPasswordLockoutUntil - new Date()) / 1000 / 60);
      return res.status(429).json({ 
        message: `Too many password reset attempts. Please try again in ${lockoutTime} minutes.`,
        lockoutUntil: user.resetPasswordLockoutUntil
      });
    }

    // Increment reset attempts
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    
    // Lock password reset after 3 attempts for 1 hour
    if (user.resetPasswordAttempts >= 3) {
      user.resetPasswordLockoutUntil = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      
      return res.status(429).json({ 
        message: "Too many password reset attempts. Please try again in 1 hour.",
        lockoutUntil: user.resetPasswordLockoutUntil
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Clear any existing reset tokens and save new one
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    
    // Also clear any other potential reset-related fields
    if (user.resetPasswordAttempts) user.resetPasswordAttempts = undefined;
    
    await user.save();
    
    console.log('Password reset email sent to:', email);

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset Request - EnviBuddies',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset for your EnviBuddies account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>Best regards,<br>EnviBuddies Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Password reset email sent successfully. Please check your email." 
    });

  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
};

// Verify Reset Token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    res.status(200).json({ 
      valid: true,
      email: user.email,
      message: "Token is valid"
    });

  } catch (err) {
    console.error("❌ Verify Reset Token Error:", err);
    res.status(500).json({ message: "Failed to verify token" });
  }
};

// Check reset token state (for debugging)
exports.checkResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Find user with reset token
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(404).json({ 
        message: "No user found with this reset token",
        token: token.substring(0, 10) + '...'
      });
    }

    const currentTime = new Date();
    const isExpired = user.resetPasswordExpires ? user.resetPasswordExpires <= currentTime : false;

    res.json({
      message: "Reset token status",
      token: token.substring(0, 10) + '...',
      userId: user._id,
      email: user.email,
      tokenExists: !!user.resetPasswordToken,
      tokenExpiry: user.resetPasswordExpires,
      currentTime: currentTime,
      isExpired: isExpired,
      timeRemaining: user.resetPasswordExpires ? 
        Math.max(0, user.resetPasswordExpires.getTime() - currentTime.getTime()) : null
    });

  } catch (error) {
    console.error('Check reset token error:', error);
    res.status(500).json({ message: "An error occurred while checking the reset token" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'password123', 'admin123'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      return res.status(400).json({ message: "This is a commonly used password. Please choose a more unique password." });
    }

    // Check password strength requirements
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
      });
    }

    // Find user with reset token
    let user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      console.log('❌ No user found with reset token:', token);
      return res.status(400).json({ message: "Invalid reset token" });
    }

    console.log('✅ User found with reset token:', {
      userId: user._id,
      email: user.email,
      tokenExists: !!user.resetPasswordToken,
      tokenExpiry: user.resetPasswordExpires,
      currentTime: new Date(),
      isExpired: user.resetPasswordExpires ? user.resetPasswordExpires <= new Date() : false
    });

    // Check if token has expired
    if (user.resetPasswordExpires && user.resetPasswordExpires <= new Date()) {
      console.log('❌ Token expired for user:', user._id);
      return res.status(400).json({ 
        message: "This reset link has expired. Please request a new password reset." 
      });
    }

    // Check if new password is the same as old password (if user has a password)
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        console.log('❌ Same password detected for user:', user._id);
        return res.status(400).json({ message: "New password cannot be the same as your old password" });
      }
    }

    // Do a final verification that the token still exists and is valid
    const tokenStillValid = await User.findOne({ 
      _id: user._id, 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!tokenStillValid) {
      console.log('❌ Token validation failed for user:', user._id);
      return res.status(400).json({ 
        message: "This reset link has already been used or has expired. Please request a new password reset." 
      });
    }

    console.log('✅ All validations passed, proceeding with password reset for user:', user._id);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token using atomic operation
    try {
      console.log('🔄 Updating password and clearing reset token for user:', user._id);
      
      const updateResult = await User.findByIdAndUpdate(
        user._id,
        {
          $set: { password: hashedPassword },
          $unset: { 
            resetPasswordToken: "", 
            resetPasswordExpires: "" 
          }
        },
        { new: true, runValidators: true }
      );

      if (!updateResult) {
        throw new Error('Failed to update user');
      }

      console.log('✅ Password reset successful for user:', user._id);
    } catch (saveError) {
      console.error('❌ Error updating user:', saveError);
      return res.status(500).json({ message: "Failed to update password" });
    }

    res.status(200).json({ 
      message: "Password reset successfully. You can now login with your new password." 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: "An error occurred while resetting your password" });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(400).json({ message: "Invalid token type" });
    }

    // Find user and verify session
    const user = await User.findOne({ 
      _id: decoded.id,
      'activeSessions.tokenId': decoded.tokenId
    }).select('+activeSessions');

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if session is expired
    const session = user.activeSessions.find(s => s.tokenId === decoded.tokenId);
    if (!session || session.expiresAt < new Date()) {
      // Remove expired session
      user.activeSessions = user.activeSessions.filter(s => s.tokenId !== decoded.tokenId);
      await user.save();
      return res.status(401).json({ message: "Refresh token expired" });
    }

    // Update session activity
    session.lastActivity = new Date();
    await user.save();

    // Generate new access token
    const newAccessToken = jwt.sign({ 
      id: user._id, 
      tokenId: decoded.tokenId,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      type: 'access'
    }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.username
    };

    // Only include organization if it exists
    if (user.organization) {
      userResponse.organization = user.organization;
    }

    res.status(200).json({ 
      accessToken: newAccessToken,
      user: userResponse
    });

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    
    console.error("❌ Refresh Token Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Remove the specific session
        await User.findByIdAndUpdate(decoded.id, {
          $pull: { activeSessions: { tokenId: decoded.tokenId } }
        });
      } catch (err) {
        // Token might be invalid, continue with logout
        console.log('Invalid token during logout:', err.message);
      }
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("❌ Logout Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Logout from all devices
exports.logoutAllDevices = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Clear all active sessions
    await User.findByIdAndUpdate(userId, {
      $set: { activeSessions: [] }
    });

    res.status(200).json({ message: "Logged out from all devices successfully" });
  } catch (err) {
    console.error("❌ Logout All Devices Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
