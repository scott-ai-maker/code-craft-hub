const mongoose = require('mongoose');
const { ValidationError } = require('../utils/errorHandler');

/**
 * Middleware to validate MongoDB ObjectID format
 * @param {string} paramName - The name of the route parameter to validate (default: 'id')
 */
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id) {
            return next(new ValidationError(`${paramName} parameter is required`));
        }
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new ValidationError(`Invalid ${paramName} format`));
        }
        
        next();
    };
};

module.exports = validateObjectId;
