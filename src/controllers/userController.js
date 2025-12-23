const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateRegistration, validateLogin } = require('../utils/validation');
const { NotFoundError, AuthenticationError, ValidationError } = require('../utils/errorHandler');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email');

// Helper: Generate access token
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '15m' } // Short-lived access token
    );
};

// Helper: Generate refresh token
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

// Helper: Get IP address from request
const getIpAddress = (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
};

// Register a new user
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
        
        // Send verification email
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

// Login user
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        validateLogin(email, password);
        
        // Find user
        const user = await User.findOne({ email });
        
        // Verify password - use generic error to prevent user enumeration
        const isMatch = user ? await user.comparePassword(password) : false;
        
        if (!user || !isMatch) {
            throw new AuthenticationError('Invalid email or password');
        }
        
        // Check if email is verified
        if (!user.isVerified) {
            throw new AuthenticationError('Please verify your email before logging in. Check your inbox for the verification link.');
        }
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user._id, getIpAddress(req));
        
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
            throw new ValidationError('User must be soft-deleted first. Use soft delete endpoint to mark user as deleted.');
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
            throw new ValidationError('User must be soft-deleted first. Use soft delete endpoint to mark user as deleted.');
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