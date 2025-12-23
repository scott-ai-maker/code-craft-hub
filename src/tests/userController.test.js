const userController = require('../controllers/userController');
const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ValidationError, AuthenticationError, NotFoundError } = require('../utils/errorHandler');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');

// Mock dependencies
jest.mock('../models/userModel');
jest.mock('../models/refreshTokenModel');
jest.mock('jsonwebtoken');
jest.mock('../utils/email');
jest.mock('crypto');

describe('User Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
            user: null,
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        process.env.JWT_SECRET = 'test-secret';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password1!'
            };

            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                isVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                generateVerificationToken: jest.fn().mockReturnValue('mock-token'),
                save: jest.fn().mockResolvedValue(true)
            };

            User.mockImplementation(() => mockUser);
            sendVerificationEmail.mockResolvedValue(true);

            await userController.registerUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: expect.stringContaining('registered successfully'),
                data: expect.objectContaining({
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user'
                })
            });
            expect(sendVerificationEmail).toHaveBeenCalled();
        });

        it('should call next with error for invalid input', async () => {
            req.body = {
                username: 'ab', // Too short
                email: 'test@example.com',
                password: 'Password1!'
            };

            await userController.registerUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should handle email sending failure gracefully', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password1!'
            };

            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                isVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                generateVerificationToken: jest.fn().mockReturnValue('mock-token'),
                save: jest.fn().mockResolvedValue(true)
            };

            User.mockImplementation(() => mockUser);
            sendVerificationEmail.mockRejectedValue(new Error('Email service down'));

            // Mock console.error to suppress error output in tests
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await userController.registerUser(req, res, next);

            // Should still succeed
            expect(res.status).toHaveBeenCalledWith(201);
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            consoleErrorSpy.mockRestore();
        });
    });

    describe('loginUser', () => {
        it('should login user successfully with valid credentials', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'Password1!'
            };

            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                isVerified: true,
                comparePassword: jest.fn().mockResolvedValue(true),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            User.findOne = jest.fn().mockResolvedValue(mockUser);
            jwt.sign = jest.fn().mockReturnValue('mock-access-token');
            
            const mockRefreshToken = {
                token: 'mock-refresh-token',
                save: jest.fn().mockResolvedValue(true)
            };
            RefreshToken.mockImplementation(() => mockRefreshToken);
            crypto.randomBytes = jest.fn().mockReturnValue({
                toString: jest.fn().mockReturnValue('mock-refresh-token')
            });

            await userController.loginUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                data: expect.objectContaining({
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token'
                })
            });
        });

        it('should reject login with invalid credentials', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'WrongPassword1!'
            };

            const mockUser = {
                comparePassword: jest.fn().mockResolvedValue(false)
            };

            User.findOne = jest.fn().mockResolvedValue(mockUser);

            await userController.loginUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should reject login for unverified email', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'Password1!'
            };

            const mockUser = {
                _id: '123',
                isVerified: false,
                comparePassword: jest.fn().mockResolvedValue(true)
            };

            User.findOne = jest.fn().mockResolvedValue(mockUser);

            await userController.loginUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
            expect(next.mock.calls[0][0].message).toContain('verify your email');
        });

        it('should reject login when user does not exist', async () => {
            req.body = {
                email: 'nonexistent@example.com',
                password: 'Password1!'
            };

            User.findOne = jest.fn().mockResolvedValue(null);

            await userController.loginUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            req.user = { id: '123' };

            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user'
            };

            User.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await userController.getProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser
            });
        });

        it('should call next with NotFoundError when user not found', async () => {
            req.user = { id: '123' };

            User.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await userController.getProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('getUserById', () => {
        it('should return user by ID', async () => {
            req.params.id = '123';

            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com'
            };

            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await userController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser
            });
        });

        it('should call next with NotFoundError when user not found', async () => {
            req.params.id = '123';

            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await userController.getUserById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('getAllUsers', () => {
        it('should return paginated users', async () => {
            req.query = { page: '1', limit: '10' };

            const mockUsers = [
                { _id: '1', username: 'user1', email: 'user1@example.com' },
                { _id: '2', username: 'user2', email: 'user2@example.com' }
            ];

            User.find = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockUsers)
            });

            User.countDocuments = jest.fn().mockResolvedValue(20);

            await userController.getAllUsers(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    users: mockUsers,
                    pagination: {
                        currentPage: 1,
                        totalPages: 2,
                        totalUsers: 20,
                        limit: 10
                    }
                }
            });
        });

        it('should use default pagination values', async () => {
            req.query = {};

            User.find = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([])
            });

            User.countDocuments = jest.fn().mockResolvedValue(0);

            await userController.getAllUsers(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    pagination: expect.objectContaining({
                        currentPage: 1,
                        limit: 10
                    })
                })
            });
        });
    });

    describe('updateProfile', () => {
        it('should update user profile', async () => {
            req.params.id = '123';
            req.user = { id: '123' };
            req.body = { username: 'newusername', email: 'newemail@example.com' };

            const mockExistingUser = {
                _id: '123',
                username: 'oldusername',
                email: 'oldemail@example.com'
            };

            const mockUpdatedUser = {
                _id: '123',
                username: 'newusername',
                email: 'newemail@example.com'
            };

            User.findOne = jest.fn().mockResolvedValue(mockExistingUser);
            User.findByIdAndUpdate = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUpdatedUser)
            });

            await userController.updateProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Profile updated successfully',
                data: mockUpdatedUser
            });
        });

        it('should reject update when user tries to update another user profile', async () => {
            req.params.id = '456';
            req.user = { id: '123' };
            req.body = { username: 'newusername' };

            await userController.updateProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should call next with NotFoundError when user not found', async () => {
            req.params.id = '123';
            req.user = { id: '123' };
            req.body = { username: 'newusername' };

            User.findOne = jest.fn().mockResolvedValue(null);

            await userController.updateProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            req.user = { id: '123' };
            req.body = {
                currentPassword: 'OldPassword1!',
                newPassword: 'NewPassword1!'
            };

            const mockUser = {
                _id: '123',
                password: 'hashed-old-password',
                comparePassword: jest.fn().mockResolvedValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById = jest.fn().mockResolvedValue(mockUser);

            await userController.changePassword(req, res, next);

            expect(mockUser.password).toBe('NewPassword1!');
            expect(mockUser.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password changed successfully'
            });
        });

        it('should reject password change with incorrect current password', async () => {
            req.user = { id: '123' };
            req.body = {
                currentPassword: 'WrongPassword1!',
                newPassword: 'NewPassword1!'
            };

            const mockUser = {
                comparePassword: jest.fn().mockResolvedValue(false)
            };

            User.findById = jest.fn().mockResolvedValue(mockUser);

            await userController.changePassword(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should reject password change with invalid new password', async () => {
            req.user = { id: '123' };
            req.body = {
                currentPassword: 'OldPassword1!',
                newPassword: 'weak'
            };

            const mockUser = {
                comparePassword: jest.fn().mockResolvedValue(true)
            };

            User.findById = jest.fn().mockResolvedValue(mockUser);

            await userController.changePassword(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should reject when passwords are missing', async () => {
            req.user = { id: '123' };
            req.body = {};

            await userController.changePassword(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });
    });

    describe('deleteUser', () => {
        it('should soft delete user successfully', async () => {
            req.params.id = '123';
            req.user = { id: '123' };

            const mockUser = {
                _id: '123',
                deletedAt: null,
                softDelete: jest.fn().mockResolvedValue(true)
            };

            User.findById = jest.fn().mockResolvedValue(mockUser);
            RefreshToken.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

            await userController.deleteUser(req, res, next);

            expect(mockUser.softDelete).toHaveBeenCalled();
            expect(RefreshToken.updateMany).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Account deleted successfully'
            });
        });

        it('should reject delete when user tries to delete another user', async () => {
            req.params.id = '456';
            req.user = { id: '123' };

            await userController.deleteUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should reject when user is already deleted', async () => {
            req.params.id = '123';
            req.user = { id: '123' };

            const mockUser = {
                _id: '123',
                deletedAt: new Date()
            };

            User.findById = jest.fn().mockResolvedValue(mockUser);

            await userController.deleteUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });
    });
});
