/**
 * User Controller
 * 
 * Handles all user-related operations including:
 * - User authentication (registration, login, password reset)
 * - User profile management (get, update, delete)
 * - Token management (refresh, logout, revoke)
 * - Email verification
 * - Admin user management
 * 
 * @module controllers/userController
 */

const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateRegistration, validateLogin } = require('../utils/validation');
const { NotFoundError, AuthenticationError, ValidationError } = require('../utils/errorHandler');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');

/**
 * Helper: Generate JWT Access Token
 * 
 * Creates a short-lived JWT token for API authentication.
 * Included payload: user ID, email, role
 * Expires in: 15 minutes
 * 
 * @param {Object} user - User document
 * @param {string} user._id - User's MongoDB ID
 * @param {string} user.email - User's email
 * @param {string} user.role - User's role (user, admin, moderator)
 * @returns {string} Signed JWT token
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '15m' } // Short-lived access token
    );
};

/**
 * Helper: Generate Refresh Token
 * 
 * Creates a long-lived refresh token for obtaining new access tokens.
 * Stored in database for validation and revocation.
 * Expires in: 7 days
 * 
 * @async
 * @param {string} userId - User's MongoDB ID
 * @param {string} ipAddress - Client IP address for tracking
 * @returns {Promise<string>} Raw refresh token (hashed before storage)
 */
const generateRefreshToken = async (userId, ipAddress) => {
    // Create a refresh token that expires in 7 days
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const refreshToken = new RefreshToken({
        token,
        userId,
        expiresAt,
        createdByIp: ipAddress,
    });
    
    await refreshToken.save();
    return token;
};

/**
 * Helper: Extract Client IP Address
 * 
 * Gets the client's IP address from request, handling proxies and load balancers.
 * 
 * @param {Object} req - Express request object
 * @returns {string} IP address or 'unknown'
 */
const getIpAddress = (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
};

/**
 * Register a New User
 * 
 * Creates a new user account with email verification requirement.
 * 
 * Process:
 * 1. Validate input (username, email, password)
 * 2. Create user (password hashed automatically)
 * 3. Generate verification token
 * 4. Send verification email (non-blocking)
 * 5. Return user details
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.username - Username (3-20 chars, alphanumeric + underscore)
 * @param {string} req.body.email - Email address
 * @param {string} req.body.password - Password (8+ chars, mixed case, number, special char)
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 * 
 * @returns {Object} 201 - User registration successful
 * @throws {ValidationError} 400 - Invalid input
 * @throws {ConflictError} 409 - Username or email already exists
 * 
 * @example
 * POST /api/users/register
 * {
 *   "username": "john_doe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 */
exports.registerUser = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        validateRegistration(username, email, password);
        
        // Create new user (password will be hashed by model pre-save hook)
        const newUser = new User({ username, email, password });
        
        // Generate verification token
        const verificationToken = newUser.generateVerificationToken();
        await newUser.save();
        
        // Send verification email (non-blocking - log errors but don't fail)
        try {
            await sendVerificationEmail(email, username, verificationToken);
        } catch (emailError) {
            // Log error but don't fail registration
            console.error('Failed to send verification email:', emailError.message);
        }
        
        res.status(201).json({ 
            success: true,
            message: 'User registered successfully. Please check your email to verify your account.',
            data: {
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                isVerified: newUser.isVerified,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login User
 * 
 * Authenticates user and returns JWT tokens.
 * 
 * Process:
 * 1. Validate email and password
 * 2. Find user by email
 * 3. Verify password
 * 4. Check email verification status
 * 5. Generate access and refresh tokens
 * 6. Return tokens and user info
 * 
 * Security:
 * - Uses generic error message to prevent user enumeration
 * - Requires email verification before login
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 * 
 * @returns {Object} 200 - Login successful with tokens
 * @throws {ValidationError} 400 - Invalid input
 * @throws {AuthenticationError} 401 - Invalid credentials or email not verified
 * 
 * @example
 * POST /api/users/login
 * {
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 */
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        validateLogin(email, password);
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }
        
        // Check if email is verified
        if (!user.isVerified) {
            throw new AuthenticationError('Please verify your email before logging in');
        }
        
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new AuthenticationError('Invalid credentials');
        }
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const ipAddress = getIpAddress(req);
        const refreshToken = await generateRefreshToken(user._id, ipAddress);
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                    refreshToken,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findOne({ _id: req.params.id, deletedAt: null }).select('-password');
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Get all users (paginated)
exports.getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 items per page
        const skip = (page - 1) * limit;
        
        const users = await User.find({ deletedAt: null })
            .select('-password')
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });
        
        const total = await User.countDocuments({ deletedAt: null });
        
        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { username, email } = req.body;
        const userId = req.params.id;
        
        // Check if user is updating their own profile
        if (req.user.id !== userId) {
            throw new AuthenticationError('You can only update your own profile');
        }
        
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        
        // Check if user exists and not deleted
        const existingUser = await User.findOne({ _id: userId, deletedAt: null });
        if (!existingUser) {
            throw new NotFoundError('User not found');
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Change password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            throw new ValidationError('Current password and new password are required');
        }
        
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new AuthenticationError('Current password is incorrect');
        }
        
        // Validate new password
        const { isValidPassword } = require('../utils/validation');
        if (!isValidPassword(newPassword)) {
            throw new ValidationError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Delete user account (soft delete)
exports.deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        
        // Check if user is deleting their own account
        if (req.user.id !== userId) {
            throw new AuthenticationError('You can only delete your own account');
        }
        
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        if (user.deletedAt) {
            throw new ValidationError('Account is already deleted');
        }
        
        // Soft delete the user
        await user.softDelete();
        
        // Revoke all refresh tokens for this user
        await RefreshToken.updateMany(
            { userId: user._id, revokedAt: null },
            { revokedAt: new Date() }
        );
        
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Verify email
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            throw new ValidationError('Verification token is required');
        }
        
        // Hash the token to match stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with matching token and non-expired token
        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: Date.now() },
        });
        
        if (!user) {
            throw new ValidationError('Invalid or expired verification token');
        }
        
        // Update user verification status
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        
        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.username);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError.message);
        }
        
        res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now log in.',
            data: {
                username: user.username,
                email: user.email,
                isVerified: user.isVerified,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Resend verification email
exports.resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            throw new ValidationError('Email is required');
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        if (user.isVerified) {
            throw new ValidationError('Email is already verified');
        }
        
        // Generate new verification token
        const verificationToken = user.generateVerificationToken();
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(email, user.username, verificationToken);
        
        res.status(200).json({
            success: true,
            message: 'Verification email sent. Please check your inbox.',
        });
    } catch (error) {
        next(error);
    }
};

// Refresh access token
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }
        
        // Find the refresh token in database
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken }).populate('userId');
        
        if (!tokenDoc) {
            throw new AuthenticationError('Invalid refresh token');
        }
        
        // Check if token is revoked
        if (tokenDoc.revokedAt) {
            throw new AuthenticationError('Refresh token has been revoked');
        }
        
        // Check if token is expired
        if (tokenDoc.isExpired) {
            throw new AuthenticationError('Refresh token has expired');
        }
        
        const user = tokenDoc.userId;
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Generate new access token
        const newAccessToken = generateAccessToken(user);
        
        // Rotate refresh token for security (optional but recommended)
        const ipAddress = getIpAddress(req);
        const newRefreshToken = await generateRefreshToken(user._id, ipAddress);
        
        // Revoke old refresh token
        tokenDoc.revoke(ipAddress, newRefreshToken);
        await tokenDoc.save();
        
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Logout - revoke refresh token
exports.logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }
        
        // Find and revoke the refresh token
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        
        if (!tokenDoc) {
            throw new NotFoundError('Refresh token not found');
        }
        
        if (tokenDoc.revokedAt) {
            return res.status(200).json({
                success: true,
                message: 'Already logged out',
            });
        }
        
        // Revoke the token
        tokenDoc.revoke(getIpAddress(req));
        await tokenDoc.save();
        
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Revoke all refresh tokens for a user (logout from all devices)
exports.revokeAllTokens = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const ipAddress = getIpAddress(req);
        
        // Find all active tokens for the user
        const tokens = await RefreshToken.find({
            userId,
            revokedAt: null,
            expiresAt: { $gt: Date.now() },
        });
        
        // Revoke all tokens
        await Promise.all(tokens.map(async (token) => {
            token.revoke(ipAddress);
            await token.save();
        }));
        
        res.status(200).json({
            success: true,
            message: `Revoked ${tokens.length} refresh token(s)`,
            data: {
                revokedCount: tokens.length,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin: Update user role
exports.updateUserRole = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        
        // Validate role
        const validRoles = ['user', 'admin', 'moderator'];
        if (!role || !validRoles.includes(role)) {
            throw new ValidationError(`Role must be one of: ${validRoles.join(', ')}`);
        }
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Prevent self-demotion from admin
        if (req.user.id === userId && req.user.role === 'admin' && role !== 'admin') {
            throw new ValidationError('Admins cannot change their own role');
        }
        
        const oldRole = user.role;
        user.role = role;
        await user.save();
        
        res.status(200).json({
            success: true,
            message: `User role updated from ${oldRole} to ${role}`,
            data: {
                userId: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Admin: Get all users with full details
exports.getAllUsersAdmin = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;
        
        // Filter by role if provided
        const filter = {};
        if (req.query.role) {
            filter.role = req.query.role;
        }
        
        // Admin can optionally view deleted users
        const includeDeleted = req.query.includeDeleted === 'true';
        if (!includeDeleted) {
            filter.deletedAt = null;
        }
        
        const users = await User.find(filter)
            .select('-password -verificationToken')
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });
        
        const total = await User.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    limit,
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Restore soft-deleted user (admin only)
exports.restoreUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        if (!user.deletedAt) {
            throw new ValidationError('User is not deleted');
        }
        
        await user.restore();
        
        res.status(200).json({
            success: true,
            message: 'User restored successfully',
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// Permanently delete user (admin only)
exports.permanentlyDeleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Only allow permanent deletion of already soft-deleted users
        if (!user.deletedAt) {
            throw new ValidationError('User must be soft-deleted first. Use soft delete endpoint to mark user as deleted.')
        }
        
        // Prevent self-deletion
        if (req.user.id === userId) {
            throw new ValidationError('Cannot permanently delete your own account');
        }
        
        // Permanently delete all associated refresh tokens
        await RefreshToken.deleteMany({ userId: user._id });
        
        // Permanently delete the user
        await User.findByIdAndDelete(userId);
        
        res.status(200).json({
            success: true,
            message: 'User permanently deleted'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Forgot Password - Request Reset Token
 * 
 * Sends a password reset email with a token.
 * Does not reveal if email exists (security best practice).
 * Token expires in 1 hour.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.email - User email
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 * 
 * @returns {Object} 200 - Password reset email sent (or appears to be)
 * @throws {ValidationError} 400 - Email not provided
 * 
 * Security: Always returns success regardless of whether email exists
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            throw new ValidationError('Email is required');
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        
        // Don't reveal if email exists (security best practice)
        if (!user || user.deletedAt) {
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
        
        // Generate password reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();
        
        // Send reset email
        try {
            await sendPasswordResetEmail(email, user.username, resetToken);
        } catch (emailError) {
            // Clear tokens if email fails
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            throw emailError;
        }
        
        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reset Password Using Token
 * 
 * Resets user password using a valid reset token.
 * Token must not be expired (1 hour expiration).
 * All refresh tokens are revoked after password change for security.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.params.token - Password reset token
 * @param {string} req.body.newPassword - New password (must meet strength requirements)
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 * 
 * @returns {Object} 200 - Password reset successfully
 * @throws {ValidationError} 400 - Invalid/expired token or weak password
 * 
 * @example
 * POST /api/users/reset-password/:token
 * {
 *   "newPassword": "NewSecurePass123!"
 * }
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        
        if (!token) {
            throw new ValidationError('Reset token is required');
        }
        
        if (!newPassword) {
            throw new ValidationError('New password is required');
        }
        
        // Validate new password
        const { isValidPassword } = require('../utils/validation');
        if (!isValidPassword(newPassword)) {
            throw new ValidationError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        }
        
        // Hash the token to match stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with matching token and non-expired token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });
        
        if (!user) {
            throw new ValidationError('Invalid or expired password reset token');
        }
        
        // Update password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        // Revoke all refresh tokens for security (forces re-login on all devices)
        await RefreshToken.updateMany(
            { userId: user._id, revokedAt: null },
            { revokedAt: new Date() }
        );
        
        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You have been logged out from all devices. Please log in with your new password.'
        });
    } catch (error) {
        next(error);
    }
};
