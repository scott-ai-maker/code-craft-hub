/**
 * Error Handling Utilities
 * 
 * Provides custom error classes and centralized error handling middleware.
 * Ensures consistent error responses across the API.
 */

const logger = require('./logger');

/**
 * Base Application Error Class
 * All custom errors should extend this class
 * 
 * @class AppError
 * @extends Error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Flag for operational vs programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error Class
 * Used for input validation failures (HTTP 400)
 * 
 * @class ValidationError
 * @extends AppError
 * @param {string} message - Validation error message
 */
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

/**
 * Authentication Error Class
 * Used for authentication failures (HTTP 401)
 * 
 * @class AuthenticationError
 * @extends AppError
 * @param {string} [message] - Authentication error message
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

/**
 * Not Found Error Class
 * Used when resource is not found (HTTP 404)
 * 
 * @class NotFoundError
 * @extends AppError
 * @param {string} [message] - Not found error message
 */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Conflict Error Class
 * Used for duplicate entries or conflicts (HTTP 409)
 * 
 * @class ConflictError
 * @extends AppError
 * @param {string} message - Conflict error message
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

/**
 * Central Error Handler Middleware
 * 
 * Catches all errors thrown in route handlers and middlewares.
 * Normalizes error responses and logs errors for debugging.
 * Must be registered as the last middleware in the Express app.
 * 
 * Error handling order:
 * 1. Mongoose duplicate key errors (11000)
 * 2. Mongoose validation errors
 * 3. JWT errors (JsonWebTokenError, TokenExpiredError)
 * 4. Custom operational errors
 * 5. Unknown programming errors
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (not used but required for error middleware)
 * 
 * @returns {void}
 */
const errorHandler = (err, req, res, next) => {
    // Log all errors with context for debugging
    logger.error({
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method
    });

    // Handle Mongoose duplicate key error (e.g., duplicate email or username)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return res.status(409).json({
            success: false,
            error: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`
        });
    }

    // Handle Mongoose schema validation errors
    if (err.name === 'ValidationError' && err.errors) {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    // Handle JWT signature errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    // Handle JWT expiration errors
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired'
        });
    }

    // Handle custom operational errors (AppError and subclasses)
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
    }

    // Handle unknown programming errors
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong' 
            : err.message
    });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
module.exports.ValidationError = ValidationError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;