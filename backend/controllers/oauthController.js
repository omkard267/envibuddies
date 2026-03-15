const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// Generate username from name
const generateUsername = (name) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.floor(Math.random() * 1000);
  return `${base}${random}`;
};

// Check username availability
const checkUsernameAvailability = async (username) => {
  const existingUser = await User.findOne({ username: username.toLowerCase() });
  return !existingUser;
};

// Generate unique username
const generateUniqueUsername = async (name) => {
  let username = generateUsername(name);
  let counter = 0;
  
  while (!(await checkUsernameAvailability(username)) && counter < 10) {
    counter++;
    username = generateUsername(name) + counter;
  }
  
  return username;
};

// Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Token is required' 
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: oauthId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Could not retrieve email from Google account'
      });
    }

    // Check if picture is a default Google placeholder
    const isDefaultPicture = picture && (
      picture.includes('googleusercontent.com') && 
      (picture.includes('=s96-c') || picture.includes('=s48-c') || picture.includes('=s32-c'))
    );
    
    // Only use picture if it's not a default placeholder
    const validPicture = isDefaultPicture ? null : picture;

    // Check if user exists with this OAuth ID (including soft-deleted)
    let user = await User.findOne({ 
      oauthProvider: 'google', 
      oauthId 
    }).select('+originalEmail +email +isDeleted +recoveryToken +recoveryTokenExpires');

    if (user) {
      // Check if account is soft-deleted
      if (user.isDeleted) {
        // Generate a recovery token for the email flow
        const recoveryToken = crypto.randomBytes(32).toString('hex');
        const recoveryTokenExpires = Date.now() + 3600000; // 1 hour
        
        user.recoveryToken = recoveryToken;
        user.recoveryTokenExpires = recoveryTokenExpires;
        await user.save();
        
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DELETED',
          message: '🚫  days after the deletion, or wait until the recovery period (7 days after the deletion) expires to use this email for a new account.',
          canRecover: true,
          recoveryToken,
          email: user.originalEmail || user.email
        });
      }
      
      // User exists with OAuth and account is active - login
      // Generate tokens with device info
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || 'unknown';
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
      
      return res.json({
        success: true,
        action: 'login',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          profileImage: user.profileImage || user.oauthPicture,
          createdAt: user.createdAt
        }
      });
    }

    // Check if user exists with this email (for account linking or restoration)
    // Include soft-deleted accounts in this check
    user = await User.findOne({ 
      $or: [
        { email },
        { originalEmail: email }
      ]
    }).select('+originalEmail +email +isDeleted +recoveryToken +recoveryTokenExpires +oauthProvider +oauthId +oauthPicture');

    if (user) {
      // If account is soft-deleted, handle recovery flow
      if (user.isDeleted) {
        // Generate a recovery token for the email flow
        const recoveryToken = crypto.randomBytes(32).toString('hex');
        const recoveryTokenExpires = Date.now() + 3600000; // 1 hour
        
        // Update user with recovery token
        user.recoveryToken = recoveryToken;
        user.recoveryTokenExpires = recoveryTokenExpires;
        
        // If this was an OAuth account, update the OAuth info
        if (!user.oauthProvider) {
          user.oauthProvider = 'google';
          user.oauthId = oauthId;
          if (validPicture) user.oauthPicture = validPicture;
        }
        
        await user.save();
        
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DELETED',
          message: '🚫 This account has been deleted. You can recover it within 7 days after the deletion, or wait until the recovery period (7 days after the deletion) expires to use this email for a new account.',
          canRecover: true,
          recoveryToken,
          email: user.originalEmail || user.email
        });
      }
      
      // If we get here, the account exists and is active
      // If it doesn't have OAuth, we'll need to link it
      if (!user.oauthProvider) {
        return res.status(200).json({
          success: true,
          action: 'link_account',
          email: user.email,
          existingUser: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            username: user.username,
            createdAt: user.createdAt
          },
          oauthData: {
            oauthId,
            name,
            email,
            picture: validPicture,
            oauthProvider: 'google',
            provider: 'google'
          },
          message: 'An account with this email already exists. Would you like to link your Google account?'
        });
      }
      
      // If we get here, the account exists, is active, and has OAuth - log them in
      // Generate tokens with device info
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || 'unknown';
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
      
      return res.json({
        success: true,
        action: 'login',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          profileImage: user.profileImage || user.oauthPicture,
          createdAt: user.createdAt
        }
      });
    }
    
    // If we get here, it means the email doesn't exist in our system
    // Check for recently deleted accounts with same email (within 7 days)
    // Check both email and originalEmail fields since deleted accounts store original email in originalEmail
    console.log(`🔍 [OAUTH_CALLBACK] Checking for recently deleted accounts with email: ${email}`);
    
    const recentlyDeletedAccount = await User.findOne({
      $or: [
        { email, isDeleted: true },
        { originalEmail: email, isDeleted: true }
      ],
      deletedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within 7 days
    });

    if (recentlyDeletedAccount) {
      console.log(`🚫 [OAUTH_CALLBACK] Found recently deleted account for email: ${email}`, {
        deletedAt: recentlyDeletedAccount.deletedAt,
        originalEmail: recentlyDeletedAccount.originalEmail,
        currentEmail: recentlyDeletedAccount.email,
        deletionId: recentlyDeletedAccount.deletionId
      });
      
      // Calculate remaining recovery time
      const recoveryDeadline = new Date(recentlyDeletedAccount.deletedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const remainingTime = Math.ceil((recoveryDeadline - now) / (24 * 60 * 60 * 1000));
      
      console.log(`⏰ [OAUTH_CALLBACK] Recovery window: ${remainingTime} days remaining until ${recoveryDeadline.toISOString()}`);
      
      return res.status(409).json({
        success: false,
        code: 'RECENTLY_DELETED_ACCOUNT',
        message: '🚫 This email address is temporarily blocked for 7 days due to a recently deleted account',
        errorType: 'RECENTLY_DELETED_ACCOUNT',
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
      console.log(`✅ [OAUTH_CALLBACK] No recently deleted accounts found for email: ${email} - proceeding with OAuth flow`);
    }

    // but we'll prevent creating a new account with OAuth if there's an existing email/password account
    // This is a safety check in case the email check above fails for some reason
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in with your password and link your Google account from the profile settings.'
      });
    }

    // New user - return OAuth data for registration completion
    return res.json({
      success: true,
      action: 'register',
      oauthData: {
        oauthId,
        name,
        email,
        picture: validPicture,
        oauthProvider: 'google'
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'OAuth authentication failed' });
  }
};

// Complete OAuth registration
exports.completeOAuthRegistration = async (req, res) => {
  try {
    console.log('🚀 [COMPLETE_OAUTH_REGISTRATION] Starting registration with data:', req.body);
    
    const {
      oauthId,
      name,
      email,
      picture,
      role,
      phone,
      username,
      interests,
      organization
    } = req.body;

    console.log('📋 [COMPLETE_OAUTH_REGISTRATION] Parsed data:', {
      oauthId: !!oauthId,
      name: !!name,
      email: !!email,
      role: !!role,
      phone: !!phone,
      username: !!username
    });

    // Validate required fields
    if (!oauthId || !name || !email || !role || !phone) {
      console.log('❌ [COMPLETE_OAUTH_REGISTRATION] Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    console.log('✅ [COMPLETE_OAUTH_REGISTRATION] Validation passed');
    
    // Check if email already exists in active accounts
    let existingUser = await User.findOne({ 
      email,
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });
    
    if (existingUser) {
      console.log('❌ [COMPLETE_OAUTH_REGISTRATION] Email already exists:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }
    
    console.log('✅ [COMPLETE_OAUTH_REGISTRATION] Email check passed');
    
    // Check if there's a soft-deleted account with this email
    // Check both email and originalEmail fields since deleted accounts store original email in originalEmail
    console.log(`🔍 [COMPLETE_OAUTH_REGISTRATION] Checking for recently deleted accounts with email: ${email}`);
    
    existingUser = await User.findOne({ 
      $or: [
        { email, isDeleted: true },
        { originalEmail: email, isDeleted: true }
      ]
    });
    
    if (existingUser) {
      console.log(`🚫 [COMPLETE_OAUTH_REGISTRATION] Found deleted account for email: ${email}`, {
        deletedAt: existingUser.deletedAt,
        originalEmail: existingUser.originalEmail,
        currentEmail: existingUser.email,
        deletionId: existingUser.deletionId
      });
      
      // Check if this is a recently deleted account (within 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isRecentlyDeleted = existingUser.deletedAt && existingUser.deletedAt > sevenDaysAgo;
      
      if (isRecentlyDeleted) {
        console.log(`⏰ [COMPLETE_OAUTH_REGISTRATION] Account was recently deleted (within 7 days) - blocking new registration`);
        
        // Calculate remaining recovery time
        const recoveryDeadline = new Date(existingUser.deletedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const remainingTime = Math.ceil((recoveryDeadline - now) / (24 * 60 * 60 * 1000));
        
        console.log(`⏰ [COMPLETE_OAUTH_REGISTRATION] Recovery window: ${remainingTime} days remaining until ${recoveryDeadline.toISOString()}`);
        
        // Return information about the recently deleted account
        return res.status(409).json({
          success: false,
          errorType: "RECENTLY_DELETED_ACCOUNT",
          message: "🚫 This email address is temporarily blocked for 7 days due to a recently deleted account",
          deletedAccount: {
            username: existingUser.username,
            name: existingUser.name,
            role: existingUser.role,
            deletedAt: existingUser.deletedAt,
            deletionSequence: existingUser.deletionSequence,
            canRecover: existingUser.deletionId ? true : false
          },
          suggestion: `You can recover your deleted account within ${remainingTime} days, or wait until ${recoveryDeadline.toLocaleDateString()} to use this email for a new account.`,
          recoveryDeadline: recoveryDeadline,
          remainingDays: remainingTime
        });
      } else {
        console.log(`✅ [COMPLETE_OAUTH_REGISTRATION] Account was deleted more than 7 days ago - allowing restoration`);
        // Account was deleted more than 7 days ago, allow restoration
        existingUser.isDeleted = false;
        existingUser.deletedAt = undefined;
        existingUser.originalEmail = undefined;
        existingUser.oauthProvider = 'google';
        existingUser.oauthId = oauthId;
        existingUser.oauthPicture = picture || null;
        existingUser.role = role;
        existingUser.phone = phone;
        existingUser.interests = interests;
        existingUser.organization = organization;
        existingUser.isEmailVerified = true;
        
        if (username) {
          existingUser.username = username.toLowerCase();
        }
        
        console.log('🔄 [COMPLETE_OAUTH_REGISTRATION] Restoring existing user account');
        
        // Generate tokens for automatic login
        const tokens = generateToken(existingUser._id, 'oauth-restore', req.ip || req.connection.remoteAddress);
        
        // Add session to user
        existingUser.activeSessions.push({
          tokenId: tokens.tokenId,
          deviceInfo: 'OAuth Account Restore',
          ipAddress: req.ip || req.connection.remoteAddress,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        
        await existingUser.save();
        
        console.log('✅ [COMPLETE_OAUTH_REGISTRATION] Account restored successfully');
        
        return res.status(200).json({
          success: true,
          message: 'Account restored successfully! Welcome back to EnviBuddies.',
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            username: existingUser.username,
            profileImage: existingUser.profileImage || existingUser.oauthPicture,
            createdAt: existingUser.createdAt
          }
        });
      }
    }

    console.log('✅ [COMPLETE_OAUTH_REGISTRATION] No existing accounts found, proceeding with new account creation');
    
    // Generate username if not provided
    let finalUsername = username;
    if (!finalUsername) {
      console.log('🔤 [COMPLETE_OAUTH_REGISTRATION] Generating username from name:', name);
      finalUsername = await generateUniqueUsername(name);
      console.log('🔤 [COMPLETE_OAUTH_REGISTRATION] Generated username:', finalUsername);
    } else {
      // Check username availability
      console.log('🔍 [COMPLETE_OAUTH_REGISTRATION] Checking username availability:', finalUsername);
      const usernameAvailable = await checkUsernameAvailability(finalUsername);
      if (!usernameAvailable) {
        console.log('❌ [COMPLETE_OAUTH_REGISTRATION] Username not available:', finalUsername);
        return res.status(400).json({ 
          success: false,
          message: 'Username already exists' 
        });
      }
      console.log('✅ [COMPLETE_OAUTH_REGISTRATION] Username available:', finalUsername);
    }

    console.log('🏗️ [COMPLETE_OAUTH_REGISTRATION] Creating user data object');
    
    // Create user data
    const userData = {
      name,
      username: finalUsername.toLowerCase(),
      email,
      phone,
      oauthProvider: 'google',
      oauthId,
      oauthPicture: picture || null,
      role,
      isEmailVerified: true, // Auto-verified for OAuth users
    };

    // Add optional fields if provided
    if (interests && Array.isArray(interests)) userData.interests = interests;
    if (organization) userData.organization = organization;

    console.log('👤 [COMPLETE_OAUTH_REGISTRATION] User data prepared:', {
      name: userData.name,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      hasOAuth: !!userData.oauthProvider
    });

    // Create user
    console.log('💾 [COMPLETE_OAUTH_REGISTRATION] Creating user in database');
    const user = await User.create(userData);
    console.log('✅ [COMPLETE_OAUTH_REGISTRATION] User created successfully:', user._id);

    // Generate tokens for automatic login
    console.log('🔑 [COMPLETE_OAUTH_REGISTRATION] Generating authentication tokens');
    const tokens = generateToken(user._id, 'oauth-signup', req.ip || req.connection.remoteAddress);
    
    // Add session to user
    user.activeSessions.push({
      tokenId: tokens.tokenId,
      deviceInfo: 'OAuth Signup',
      ipAddress: req.ip || req.connection.remoteAddress,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    console.log('💾 [COMPLETE_OAUTH_REGISTRATION] Saving user with session data');
    await user.save();

    console.log('🎉 [COMPLETE_OAUTH_REGISTRATION] Registration completed successfully, sending response');

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to EnviBuddies.',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profileImage: user.profileImage || user.oauthPicture,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [COMPLETE_OAUTH_REGISTRATION] Error occurred:', error);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed: ' + error.message 
    });
  }
};

// Link OAuth to existing account
exports.linkOAuthAccount = async (req, res) => {
  try {
    const { userId, oauthId, oauthProvider, oauthPicture } = req.body;

    console.log('Account linking request:', {
      userId,
      oauthId,
      oauthProvider,
      oauthPicture,
      body: req.body
    });

    if (!userId || !oauthId) {
      console.log('Missing required fields:', { userId: !!userId, oauthId: !!oauthId });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find existing user
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', {
      userId: user._id,
      email: user.email,
      hasOAuth: !!user.oauthProvider
    });

    // Check if OAuth ID is already linked to another account
    const existingOAuth = await User.findOne({ oauthProvider: 'google', oauthId });
    if (existingOAuth) {
      console.log('OAuth ID already linked to another user:', oauthId);
      return res.status(400).json({ message: 'This Google account is already linked to another user' });
    }

    // Update user with OAuth information
    user.oauthProvider = oauthProvider || 'google';
    user.oauthId = oauthId;
    user.oauthPicture = oauthPicture || null;
    user.isEmailVerified = true; // Auto-verify email for OAuth users

    console.log('Updating user with OAuth data:', {
      oauthProvider: user.oauthProvider,
      oauthId: user.oauthId,
      hasPicture: !!user.oauthPicture
    });

    await user.save();

    console.log('Account linked successfully for user:', userId);

    res.json({
      success: true,
      message: 'Google account linked successfully. Please login to continue.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        profileImage: user.profileImage || user.oauthPicture,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Account linking error:', error);
    res.status(500).json({ message: 'Account linking failed: ' + error.message });
  }
};

// Unlink OAuth account
exports.unlinkOAuthAccount = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has password (can't unlink if no password)
    if (!user.password) {
      return res.status(400).json({ 
        message: 'Cannot unlink Google account. Please set a password first.' 
      });
    }

    // Remove OAuth data
    user.oauthProvider = null;
    user.oauthId = null;
    user.oauthPicture = null;

    await user.save();

    res.json({
      success: true,
      message: 'Google account unlinked successfully'
    });

  } catch (error) {
    res.status(500).json({ message: 'Account unlinking failed' });
  }
};

// Check username availability
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const available = await checkUsernameAvailability(username);
    
    res.json({
      available,
      message: available ? 'Username is available' : 'Username is not available'
    });

  } catch (error) {
    console.error('Username Check Error:', error);
    res.status(500).json({ message: 'Username check failed' });
  }
};
