/**
 * Custom error class for API errors
 */
class ErrorResponse extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.isOperational = true;
    
    // Capture stack trace (excluding constructor call from it)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper for Express routes
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error handling middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log to console for development
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404, 'NOT_FOUND');
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}`;
    error = new ErrorResponse(message, 400, 'DUPLICATE_KEY');
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(messages, 400, 'VALIDATION_ERROR');
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Not authorized', 401, 'AUTH_ERROR');
  }
  
  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Token expired', 401, 'TOKEN_EXPIRED');
  }
  
  // Default to 500 server error
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    code: error.code || 'SERVER_ERROR'
  });
};

module.exports = {
  ErrorResponse,
  asyncHandler,
  errorHandler
};
