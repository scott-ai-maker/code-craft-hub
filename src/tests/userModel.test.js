const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Mock bcrypt
jest.mock('bcrypt');

describe('User Model', () => {
    let User;

    beforeAll(() => {
        // Import the User model after mocking
        User = require('../models/userModel');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema Validation', () => {
        it('should have required fields defined', () => {
            const requiredFields = ['username', 'email', 'password'];
            
            requiredFields.forEach(field => {
                const fieldSchema = User.schema.path(field);
                expect(fieldSchema).toBeDefined();
                expect(fieldSchema.isRequired).toBe(true);
            });
        });

        it('should have correct default values', () => {
            const roleField = User.schema.path('role');
            const isVerifiedField = User.schema.path('isVerified');
            const deletedAtField = User.schema.path('deletedAt');

            expect(roleField.defaultValue).toBe('user');
            expect(isVerifiedField.defaultValue).toBe(false);
            expect(deletedAtField.defaultValue).toBe(null);
        });

        it('should have enum values for role', () => {
            const roleField = User.schema.path('role');
            const enumValues = roleField.enumValues;

            expect(enumValues).toContain('user');
            expect(enumValues).toContain('admin');
            expect(enumValues).toContain('moderator');
            expect(enumValues.length).toBe(3);
        });

        it('should have email with lowercase and trim options', () => {
            const emailField = User.schema.path('email');

            expect(emailField.options.trim).toBe(true);
            expect(emailField.options.lowercase).toBe(true);
        });

        it('should have timestamps enabled', () => {
            expect(User.schema.options.timestamps).toBe(true);
        });

        it('should have unique constraint on username and email', () => {
            const usernameField = User.schema.path('username');
            const emailField = User.schema.path('email');

            expect(usernameField.options.unique).toBe(true);
            expect(emailField.options.unique).toBe(true);
        });
    });

    describe('Query Helpers', () => {
        it('should have notDeleted query helper', () => {
            expect(typeof User.schema.query.notDeleted).toBe('function');
        });

        it('should have onlyDeleted query helper', () => {
            expect(typeof User.schema.query.onlyDeleted).toBe('function');
        });
    });

    describe('Virtual Properties', () => {
        it('should have isDeleted virtual', () => {
            const virtual = User.schema.virtuals.isDeleted;
            expect(virtual).toBeDefined();
        });
    });

    describe('Instance Methods', () => {
        let user;

        beforeEach(() => {
            user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password'
            });
        });

        it('should have softDelete method', () => {
            expect(typeof user.softDelete).toBe('function');
        });

        it('should have restore method', () => {
            expect(typeof user.restore).toBe('function');
        });

        it('should have comparePassword method', () => {
            expect(typeof user.comparePassword).toBe('function');
        });

        it('should have generateVerificationToken method', () => {
            expect(typeof user.generateVerificationToken).toBe('function');
        });

        it('should have generatePasswordResetToken method', () => {
            expect(typeof user.generatePasswordResetToken).toBe('function');
        });

        describe('comparePassword functionality', () => {
            it('should call bcrypt.compare with correct arguments', async () => {
                user.password = 'hashedPassword';
                bcrypt.compare = jest.fn().mockResolvedValue(true);

                const result = await user.comparePassword('plainPassword');

                expect(bcrypt.compare).toHaveBeenCalledWith('plainPassword', 'hashedPassword');
                expect(result).toBe(true);
            });

            it('should return false for non-matching password', async () => {
                user.password = 'hashedPassword';
                bcrypt.compare = jest.fn().mockResolvedValue(false);

                const result = await user.comparePassword('wrongPassword');

                expect(result).toBe(false);
            });
        });
    });

    describe('Pre-save Hook', () => {
        it('should have pre-save hook defined', () => {
            const preSaveHooks = User.schema.s.hooks._pres.get('save');
            expect(preSaveHooks).toBeDefined();
            expect(preSaveHooks.length).toBeGreaterThan(0);
        });
    });
});
