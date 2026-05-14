// middleware/auth.js

/**
 * 1. Verification Middleware
 * Ensures the user is logged into the system
 */
export const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    // If not logged in, redirect to login page
    res.redirect('/login');
};

/**
 * 2. General Authorization Middleware
 * Checks if the user's role matches the required permission
 */
export const authorize = (permittedRoles) => {
    return (req, res, next) => {
        const { user } = req.session;

        // Admin has 'Overall Powers' - they bypass all role checks
        if (user && user.role === 'admin') {
            return next();
        }

        // Check if the user's specific role is allowed for this route
        if (user && permittedRoles.includes(user.role)) {
            return next();
        }

        // If user doesn't have the right role
        res.status(403).render('error', { 
            message: "Access Denied: You do not have permission to perform this action." 
        });
    };
};

/**
 * 3. Pre-defined Shortcuts for NYONDO Roles
 */
export const isAdmin = authorize(['admin']);
export const isStockManager = authorize(['stock_manager']);
export const isSalesAttendant = authorize(['sales_attendant']);