/**
 * User Model
 * 
 * Represents a user in the system with authentication, authorization, and soft deletion support.
 * 
 * Features:
 * - Password hashing with bcrypt
 * - Email and verification token management
 * - Password reset token generation
 * - Soft delete functionality (data retention)
 * - Role-based access control (user, admin, moderator)
 * - Automatic timestamps (createdAt, updatedAt)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * User Schema Definition
 * 
 * @typedef {Object} User
 * @property {string} username - Unique username (required, unique, trimmed)
 * @property {string} email - Unique email address (required, unique, lowercase, trimmed)
 * @property {string} password - Hashed password (required)
 * @property {string} role - User role: 'user', 'admin', or 'moderator' (default: 'user')
 * @property {boolean} isVerified - Email verification status (default: false)
 * @property {string} verificationToken - Hashed token for email verification
 * @property {Date} verificationTokenExpires - Expiration time for verification token (24 hours)
 * @property {string} passwordResetToken - Hashed token for password reset
 * @property {Date} passwordResetExpires - Expiration time for password reset token (1 hour)
 * @property {Date} deletedAt - Soft delete timestamp (null means active user)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated last update timestamp
 */
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
    },
    verificationTokenExpires: {
        type: Date,
    },
    passwordResetToken: {
        type: String,
    },
    passwordResetExpires: {
        type: Date,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

/**
 * Query Helper: notDeleted()
 * Returns only active (non-deleted) users
 * 
 * Usage: User.find().notDeleted()
 */
userSchema.query.notDeleted = function() {
    return this.where({ deletedAt: null });
};

/**
 * Query Helper: onlyDeleted()
 * Returns only soft-deleted users for recovery purposes
 * 
 * Usage: User.find().onlyDeleted()
 */
userSchema.query.onlyDeleted = function() {
    return this.where({ deletedAt: { $ne: null } });
};

/**
 * Virtual Property: isDeleted
 * Computed property that checks if user is deleted
 * 
 * @returns {boolean} True if user is soft-deleted, false otherwise
 */
userSchema.virtual('isDeleted').get(function() {
    return this.deletedAt !== null;
});

/**
 * Instance Method: softDelete()
 * Soft delete a user by setting deletedAt timestamp
 * User data is retained in database for compliance/recovery
 * 
 * @async
 * @returns {Promise<Object>} The saved user document
 */
userSchema.methods.softDelete = function() {
    this.deletedAt = new Date();
    return this.save();
};

/**
 * Instance Method: restore()
 * Restore a soft-deleted user
 * 
 * @async
 * @returns {Promise<Object>} The restored user document
 */
userSchema.methods.restore = function() {
    this.deletedAt = null;
    return this.save();
};

/**
 * Pre-save Hook: Hash Password
 * Automatically hashes password before saving to database
 * Only runs when password is modified (new user or password change)
 * 
 * Security: Uses bcrypt with salt rounds of 10
 */
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        // Hash password with bcrypt (10 salt rounds for security)
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

/**
 * Instance Method: comparePassword()
 * Compares plain text password with hashed password
 * Used during login authentication
 * 
 * @async
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance Method: generateVerificationToken()
 * Generates a secure token for email verification
 * Token is hashed before storage for security
 * Expires in 24 hours
 * 
 * @returns {string} Raw token to send via email (hashed version stored in DB)
 */
userSchema.methods.generateVerificationToken = function () {
    // Generate 32 random bytes and convert to hex string
    const token = crypto.randomBytes(32).toString('hex');
    // Hash the token for secure storage
    this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
    // Set expiration to 24 hours from now
    this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    return token;
};

/**
 * Instance Method: generatePasswordResetToken()
 * Generates a secure token for password reset
 * Token is hashed before storage for security
 * Expires in 1 hour for security
 * 
 * @returns {string} Raw token to send via email (hashed version stored in DB)
 */
userSchema.methods.generatePasswordResetToken = function () {
    // Generate 32 random bytes and convert to hex string
    const token = crypto.randomBytes(32).toString('hex');
    // Hash the token for secure storage
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    // Set expiration to 1 hour from now
    this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000;
    return token;
};

/**
 * Create and export User model
 */
const User = mongoose.model('User', userSchema);
module.exports = User;