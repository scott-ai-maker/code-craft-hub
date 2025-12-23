/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens in the Authorization header.
 * Must be placed before protected routes that require authentication.
 * 
 * Expected header format: "Bearer <token>"
 * 
 * On success: Attaches decoded token to req.user
 * On failure: Returns 401 Unauthorized with error message
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/errorHandler');

/**
 * Middleware function to authenticate requests using JWT
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers containing Authorization header
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Sets req.user with decoded token payload containing:
 * - id: User ID
 * - email: User email
 * - role: User role
 * 
 * @returns {void} Calls next() on success or sends error response on failure
 */
const authMiddleware = (req, res, next) => {
    try {
        // Extract Authorization header
        const authHeader = req.header('Authorization');
        
        // Check if header exists
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                error: 'Access denied. No token provided.' 
            });
        }
        
        // Extract token from "Bearer <token>" format
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Access denied. Invalid token format.' 
            });
        }
        
        // Verify token and attach decoded payload to request
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = verified;
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expired. Please login again.' 
            });
        }
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid token.' 
        });
    }
};

module.exports = authMiddleware;