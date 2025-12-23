const authorize = require('../middleware/authorize');

describe('Authorize Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call next() when user has the required role', () => {
        req.user = { id: '123', email: 'test@example.com', role: 'admin' };
        const middleware = authorize('admin');

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() when user has one of multiple required roles', () => {
        req.user = { id: '123', email: 'test@example.com', role: 'moderator' };
        const middleware = authorize('admin', 'moderator');

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
        const middleware = authorize('admin');

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Authentication required'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
        req.user = { id: '123', email: 'test@example.com', role: 'user' };
        const middleware = authorize('admin');

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Insufficient permissions. Required role: admin'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with multiple roles message when user lacks required roles', () => {
        req.user = { id: '123', email: 'test@example.com', role: 'user' };
        const middleware = authorize('admin', 'moderator');

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Insufficient permissions. Required role: admin or moderator'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should work with single role as string', () => {
        req.user = { id: '123', email: 'test@example.com', role: 'user' };
        const middleware = authorize('user');

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should handle edge case with empty user object', () => {
        req.user = {};
        const middleware = authorize('admin');

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
