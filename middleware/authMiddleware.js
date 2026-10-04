const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes: checks JWT in Authorization header or session user
 */
const protect = async (req, res, next) => {
    let token;

    try {
        const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

        // 1. Check for JWT Bearer token in headers
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(
                token,
                (process.env.JWT_SECRET || 'medical_care_jwt_super_secret_key_2026_secure').trim()
            );

            // Robustly extract user ID whether encoded as string, ObjectId hex, or legacy Buffer object
            let userId = decoded.id;
            if (userId && typeof userId === 'object') {
                if (userId.data && Array.isArray(userId.data)) {
                    userId = Buffer.from(userId.data).toString('hex');
                } else if (userId._id || userId.id) {
                    userId = (userId._id || userId.id).toString();
                }
            } else if (userId) {
                userId = String(userId);
            }

            if (isDbConnected) {
                let user = null;
                if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                    user = await User.findById(userId).select('-password');
                }
                if (!user && decoded.email) {
                    user = await User.findOne({ email: decoded.email.toLowerCase().trim() }).select('-password');
                }
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User belonging to this token no longer exists.'
                    });
                }
                req.user = user;
            } else {
                const { memoryUsers } = require('../controllers/authController');
                let user = memoryUsers.get(userId) || (decoded.email ? memoryUsers.get(decoded.email.toLowerCase().trim()) : null);
                if (!user) {
                    const isAdmin = decoded.role === 'Admin' || decoded.email === 'admin@medicalcare.com' || decoded.email === 'pranavvaitla2@gmail.com';
                    user = {
                        id: userId || 'mem_' + Date.now(),
                        name: decoded.name || (isAdmin ? 'System Admin' : 'Authenticated User'),
                        email: decoded.email || (isAdmin ? 'admin@medicalcare.com' : 'user@example.com'),
                        role: isAdmin ? 'Admin' : (decoded.role || 'Patient'),
                        doctorAccess: isAdmin ? false : Boolean(decoded.doctorAccess || decoded.role === 'Doctor')
                    };
                    memoryUsers.set(user.id, user);
                    if (user.email) memoryUsers.set(user.email, user);
                }
                user.doctorAccess = user.role === 'Admin' ? false : Boolean(user.doctorAccess || user.role === 'Doctor');
                req.user = user;
            }

            return next();
        }

        // 2. Check for active express-session user
        if (req.session && req.session.user) {
            if (isDbConnected) {
                req.user = await User.findById(req.session.user.id).select('-password');
                if (req.user) {
                    req.user.doctorAccess = req.user.role === 'Admin' ? false : Boolean(req.user.doctorAccess || req.user.role === 'Doctor');
                    return next();
                }
            } else {
                const { memoryUsers } = require('../controllers/authController');
                const user = memoryUsers.get(req.session.user.id) || (req.session.user.email ? memoryUsers.get(req.session.user.email) : null);
                if (user) {
                    user.doctorAccess = user.role === 'Admin' ? false : Boolean(user.doctorAccess || user.role === 'Doctor');
                    req.user = user;
                    req.session.user = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        doctorAccess: user.doctorAccess
                    };
                } else {
                    req.user = req.session.user;
                }
                return next();
            }
        }

        return res.status(401).json({
            success: false,
            message: 'Not authorized! Please log in to access this resource.'
        });
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed! Invalid or expired token.'
        });
    }
};

module.exports = { protect };
