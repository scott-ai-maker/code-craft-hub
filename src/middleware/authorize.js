/**
 * Role-Based Authorization Middleware
 * Checks if the authenticated user has one of the required roles
 * Must be used after authMiddleware
 */

const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user exists (should be set by authMiddleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if user has required role
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions. Required role: ' + roles.join(' or ')
            });
        }

        next();
    };
};

module.exports = authorize;
