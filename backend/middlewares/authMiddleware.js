const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { ErrorResponse } = require('../utils/errorResponse');

/**
 * Middleware to verify JWT token and attach user to request
 * Allows both active and soft-deleted users to authenticate
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify token type
      if (decoded.type !== 'access') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token type' 
        });
      }
      
      // Find user including soft-deleted ones and verify session
      const user = await User.findOne({ 
        _id: decoded.id,
        'activeSessions.tokenId': decoded.tokenId
      })
        .select('-password')
        .lean();
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Not authorized, user not found or session invalid' 
        });
      }
      
      // Check if session is expired
      const session = user.activeSessions.find(s => s.tokenId === decoded.tokenId);
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ 
          success: false,
          message: 'Session expired, please login again' 
        });
      }
      
      // Attach user and deletion status to request
      req.user = user;
      req.isDeleted = user.isDeleted || false;
      req.sessionId = decoded.tokenId;
      
      return next();
    } catch (error) {
      console.error('Auth error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired, please login again' 
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token' 
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token failed' 
      });
    }
  }

  return res.status(401).json({ 
    success: false,
    message: 'Not authorized, no token provided' 
  });
};

/**
 * Middleware to ensure the user account is active (not soft-deleted)
 * Must be used after protect()
 */
const requireActiveAccount = (req, res, next) => {
  // Allow account deletion even for soft-deleted accounts
  if (req.method === 'DELETE' && req.originalUrl.includes('/api/account')) {
    return next();
  }
  
  if (req.isDeleted) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_DELETED',
      message: 'This account has been deleted. Please contact support to recover your account.'
    });
  }
  next();
};

/**
 * Middleware to ensure user has organizer role
 * Must be used after protect() and requireActiveAccount()
 */
const requireOrganizer = (req, res, next) => {
  if (req.user && req.user.role === 'organizer') {
    return next();
  }
  return res.status(403).json({ 
    success: false,
    message: 'Access denied: Organizer role required' 
  });
};

/**
 * Middleware to check if the authenticated user is the account owner or an admin
 * Must be used after protect() and requireActiveAccount()
 */
const isAccountOwner = (req, res, next) => {
  // Allow admins to access any account
  if (req.user.role === 'admin') {
    return next();
  }
  
  // For account deletion, we don't need to check userId in params/body 
  // since we're already getting the user from the JWT token
  // Just check if the path includes 'account' and the method is DELETE
  if (req.method === 'DELETE' && req.originalUrl.includes('account')) {
    return next();
  }
  
  // For other requests, check if the requested userId matches the authenticated user's ID
  const requestedUserId = req.params.userId || req.body.userId;
  if (!requestedUserId || requestedUserId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this resource'
    });
  }
  
  next();
};

module.exports = { 
  protect, 
  requireOrganizer, 
  requireActiveAccount,
  isAccountOwner
};
