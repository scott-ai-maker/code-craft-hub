const express = require('express');
const { 
    registerUser, 
    loginUser, 
    getProfile, 
    getUserById,
    getAllUsers,
    updateProfile, 
    changePassword, 
    deleteUser,
    verifyEmail,
    resendVerification,
    refreshToken,
    logout,
    revokeAllTokens,
    updateUserRole,
    getAllUsersAdmin,
    restoreUser,
    permanentlyDeleteUser,
    forgotPassword,
    resetPassword
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const validateObjectId = require('../middleware/validateObjectId');
const { authLimiter } = require('../config/server');

const router = express.Router();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account and send verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 */
// Public routes with strict rate limiting
router.post('/register', authLimiter, registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user and return access/refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (15 min expiry)
 *                     refreshToken:
 *                       type: string
 *                       description: Refresh token (7 days expiry)
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials or unverified email
 */
router.post('/login', authLimiter, loginUser);

/**
 * @swagger
 * /api/users/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Exchange refresh token for new access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Revoke refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/users/verify-email/{token}:
 *   get:
 *     tags: [Email Verification]
 *     summary: Verify email address
 *     description: Verify user email with verification token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @swagger
 * /api/users/resend-verification:
 *   post:
 *     tags: [Email Verification]
 *     summary: Resend verification email
 *     description: Send a new verification email to user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent
 *       429:
 *         description: Too many requests
 */
router.post('/resend-verification', authLimiter, resendVerification);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Retrieve authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);

/**
 * @swagger
 * /api/users/revoke-all-tokens:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke all refresh tokens
 *     description: Logout from all devices by revoking all user's refresh tokens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All tokens revoked
 */
router.post('/revoke-all-tokens', authMiddleware, revokeAllTokens);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (paginated)
 *     description: Retrieve list of all users with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', authMiddleware, getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/:id', authMiddleware, validateObjectId('id'), getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/:id', authMiddleware, validateObjectId('id'), updateProfile);

/**
 * @swagger
 * /api/users/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.patch('/password', authMiddleware, changePassword);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/:id', authMiddleware, validateObjectId('id'), deleteUser);

/**
 * @swagger
 * /api/users/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users (admin view)
 *     description: Admin endpoint with full user details and filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, moderator]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Users retrieved
 *       403:
 *         description: Insufficient permissions
 */
// Admin-only routes
router.get('/admin/users', authMiddleware, authorize('admin'), getAllUsersAdmin);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user role
 *     description: Change user's role (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id/role', authMiddleware, authorize('admin'), validateObjectId('id'), updateUserRole);

/**
 * @swagger
 * /api/users/admin/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user (admin/moderator)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Insufficient permissions
 */
// Moderator and Admin routes
router.delete('/admin/:id', authMiddleware, authorize('admin', 'moderator'), validateObjectId('id'), deleteUser);

/**
 * @swagger
 * /api/users/{id}/restore:
 *   post:
 *     tags: [Admin]
 *     summary: Restore soft-deleted user
 *     description: Restore a user that was soft-deleted (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User restored successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found or not deleted
 */
router.post('/:id/restore', authMiddleware, authorize('admin'), validateObjectId('id'), restoreUser);

/**
 * @swagger
 * /api/users/{id}/permanent-delete:
 *   delete:
 *     tags: [Admin]
 *     summary: Permanently delete user
 *     description: Permanently remove a soft-deleted user from database (admin only). User must be soft-deleted first.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User permanently deleted
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       400:
 *         description: User is not soft-deleted
 */
router.delete('/:id/permanent-delete', authMiddleware, authorize('admin'), validateObjectId('id'), permanentlyDeleteUser);

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset email for users who forgot their password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 *       400:
 *         description: Email is required
 */
router.post('/forgot-password', authLimiter, forgotPassword);

/**
 * @swagger
 * /api/users/reset-password/{token}:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     description: Reset user password using the token from the reset email. Logs out user from all devices.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewSecurePass123!
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       422:
 *         description: Invalid password format
 */
router.post('/reset-password/:token', resetPassword);

module.exports = router;