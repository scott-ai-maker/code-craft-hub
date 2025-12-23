const validateObjectId = require('../middleware/validateObjectId');
const mongoose = require('mongoose');
const { ValidationError } = require('../utils/errorHandler');

describe('ValidateObjectId Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {}
        };
        res = {};
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('with default parameter name (id)', () => {
        it('should call next() with valid ObjectId', () => {
            req.params.id = new mongoose.Types.ObjectId().toString();
            const middleware = validateObjectId();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('should call next() with ValidationError for invalid ObjectId', () => {
            req.params.id = 'invalid-id';
            const middleware = validateObjectId();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('Invalid id format');
        });

        it('should call next() with ValidationError when id is missing', () => {
            const middleware = validateObjectId();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('id parameter is required');
        });
    });

    describe('with custom parameter name', () => {
        it('should call next() with valid ObjectId for custom param', () => {
            req.params.userId = new mongoose.Types.ObjectId().toString();
            const middleware = validateObjectId('userId');

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        it('should call next() with ValidationError for invalid custom param', () => {
            req.params.userId = 'not-an-object-id';
            const middleware = validateObjectId('userId');

            middleware(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('Invalid userId format');
        });

        it('should call next() with ValidationError when custom param is missing', () => {
            const middleware = validateObjectId('postId');

            middleware(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('postId parameter is required');
        });
    });

    describe('edge cases', () => {
        it('should reject empty string as invalid ObjectId', () => {
            req.params.id = '';
            const middleware = validateObjectId();

            middleware(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
        });

        it('should reject null as invalid ObjectId', () => {
            req.params.id = null;
            const middleware = validateObjectId();

            middleware(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
        });

        it('should accept 24-character hex string as valid ObjectId', () => {
            req.params.id = '507f1f77bcf86cd799439011';
            const middleware = validateObjectId();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        it('should reject 24-character non-hex string', () => {
            req.params.id = 'zzzzzzzzzzzzzzzzzzzzzzzz';
            const middleware = validateObjectId();

            middleware(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error).toBeInstanceOf(ValidationError);
        });
    });
});
