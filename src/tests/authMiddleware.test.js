const authMiddleware = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// Mock jwt
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            header: jest.fn()
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

    it('should call next() with valid token', () => {
        const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
        req.header.mockReturnValue('Bearer valid-token');
        jwt.verify.mockReturnValue(mockUser);

        authMiddleware(req, res, next);

        expect(req.header).toHaveBeenCalledWith('Authorization');
        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no Authorization header is provided', () => {
        req.header.mockReturnValue(null);

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Access denied. No token provided.'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token format is invalid', () => {
        req.header.mockReturnValue('InvalidFormat');

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Access denied. Invalid token format.'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
        req.header.mockReturnValue('Bearer expired-token');
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        jwt.verify.mockImplementation(() => {
            throw error;
        });

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Token expired. Please login again.'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
        req.header.mockReturnValue('Bearer invalid-token');
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid token.'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should extract token from Bearer scheme correctly', () => {
        const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
        req.header.mockReturnValue('Bearer my-token-value');
        jwt.verify.mockReturnValue(mockUser);

        authMiddleware(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('my-token-value', 'test-secret');
        expect(next).toHaveBeenCalled();
    });
});
