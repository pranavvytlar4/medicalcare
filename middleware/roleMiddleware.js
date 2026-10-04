/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles (e.g. 'Admin', 'Doctor', 'Patient')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required.'
            });
        }

        const userRole = req.user.role;
        const hasDoctorAccess = (req.user.doctorAccess === true || userRole === 'Doctor') && userRole !== 'Admin';

        let isAllowed = roles.includes(userRole);
        if (roles.includes('Doctor') && hasDoctorAccess) {
            isAllowed = true;
        }

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: `Access denied! Doctor Panel permissions must be explicitly granted by an Administrator in the Admin Panel.`
            });
        }

        next();
    };
};

module.exports = { authorize };
