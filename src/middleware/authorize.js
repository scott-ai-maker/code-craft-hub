/**
 * Authorization Middleware (Role-Based Access Control)
 * 
 * Checks if the authenticated user has one of the required roles.
 * Must be used AFTER authMiddleware to ensure req.user is populated.
 * 
 * Usage Examples:
 * - authorize('admin') - Only admins
 * - authorize('admin', 'moderator') - Admins or moderators
 * - authorize('user', 'admin') - Regular users or admins
 * 
 * @param {...string} roles - Required roles for access
 * @returns {Function} Express middleware function
 */

/**
 * Role-based authorization middleware
 * 
 * @param {...string} roles - One or more required roles
 * @returns {Function} Middleware function that checks user role
 * 
 * @example
 * // Protect route for admins only
 * router.delete('/users/:id', authMiddleware, authorize('admin'), deleteUser);
 * 
 * @example
 * // Allow access for admins or moderators
 * router.put('/users/:id', authMiddleware, authorize('admin', 'moderator'), updateUser);
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

        // Check if user's role is in the list of allowed roles
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions. Required role: ' + roles.join(' or ')
            });
        }

        // User has required role, proceed to next middleware/route
        next();
    };
};

module.exports = authorize;
