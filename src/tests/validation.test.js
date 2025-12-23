const {
    isValidEmail,
    isValidPassword,
    isValidUsername,
    validateRegistration,
    validateLogin
} = require('../utils/validation');
const { ValidationError } = require('../utils/errorHandler');

describe('Validation Utils', () => {
    describe('isValidEmail', () => {
        it('should return true for valid email addresses', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('user+tag@example.com')).toBe(true);
        });

        it('should return false for invalid email addresses', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('invalid@')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
            expect(isValidEmail('user @example.com')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });

    describe('isValidPassword', () => {
        it('should return true for valid passwords', () => {
            expect(isValidPassword('Password1!')).toBe(true);
            expect(isValidPassword('MyP@ssw0rd')).toBe(true);
            expect(isValidPassword('Secure123$')).toBe(true);
        });

        it('should return false for passwords without uppercase letters', () => {
            expect(isValidPassword('password1!')).toBe(false);
        });

        it('should return false for passwords without lowercase letters', () => {
            expect(isValidPassword('PASSWORD1!')).toBe(false);
        });

        it('should return false for passwords without numbers', () => {
            expect(isValidPassword('Password!')).toBe(false);
        });

        it('should return false for passwords without special characters', () => {
            expect(isValidPassword('Password1')).toBe(false);
        });

        it('should return false for passwords shorter than 8 characters', () => {
            expect(isValidPassword('Pass1!')).toBe(false);
        });
    });

    describe('isValidUsername', () => {
        it('should return true for valid usernames', () => {
            expect(isValidUsername('user123')).toBe(true);
            expect(isValidUsername('test_user')).toBe(true);
            expect(isValidUsername('User_Name_123')).toBe(true);
        });

        it('should return false for usernames shorter than 3 characters', () => {
            expect(isValidUsername('ab')).toBe(false);
        });

        it('should return false for usernames longer than 20 characters', () => {
            expect(isValidUsername('verylongusernamethatexceedslimit')).toBe(false);
        });

        it('should return false for usernames with special characters', () => {
            expect(isValidUsername('user@name')).toBe(false);
            expect(isValidUsername('user-name')).toBe(false);
            expect(isValidUsername('user name')).toBe(false);
        });

        it('should return false for empty usernames', () => {
            expect(isValidUsername('')).toBe(false);
        });
    });

    describe('validateRegistration', () => {
        it('should not throw for valid registration data', () => {
            expect(() => {
                validateRegistration('testuser', 'test@example.com', 'Password1!');
            }).not.toThrow();
        });

        it('should throw ValidationError when fields are missing', () => {
            expect(() => {
                validateRegistration('', 'test@example.com', 'Password1!');
            }).toThrow(ValidationError);

            expect(() => {
                validateRegistration('testuser', '', 'Password1!');
            }).toThrow(ValidationError);

            expect(() => {
                validateRegistration('testuser', 'test@example.com', '');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid username', () => {
            expect(() => {
                validateRegistration('ab', 'test@example.com', 'Password1!');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid email', () => {
            expect(() => {
                validateRegistration('testuser', 'invalid-email', 'Password1!');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid password', () => {
            expect(() => {
                validateRegistration('testuser', 'test@example.com', 'weak');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError with multiple errors', () => {
            try {
                validateRegistration('ab', 'invalid', 'weak');
                fail('Should have thrown ValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect(error.message).toContain('Username');
                expect(error.message).toContain('email');
                expect(error.message).toContain('Password');
            }
        });
    });

    describe('validateLogin', () => {
        it('should not throw for valid login data', () => {
            expect(() => {
                validateLogin('test@example.com', 'Password1!');
            }).not.toThrow();
        });

        it('should throw ValidationError when email is missing', () => {
            expect(() => {
                validateLogin('', 'Password1!');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError when password is missing', () => {
            expect(() => {
                validateLogin('test@example.com', '');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid email format', () => {
            expect(() => {
                validateLogin('invalid-email', 'Password1!');
            }).toThrow(ValidationError);
        });
    });
});
