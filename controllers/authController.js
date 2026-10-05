const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const connectDB = require('../config/db');
const { sendOtpEmail } = require('../config/email');

const USERS_FILE = path.join(__dirname, '..', 'data', 'persistedUsers.json');

// In-memory user store fallback (no default accounts — use scripts/seedAdmin.js).
const memoryUsers = new Map();

// Helper to save registered users to persisted file
const savePersistedUsers = () => {
    try {
        const unique = Array.from(memoryUsers.values())
            .filter((u, idx, arr) => arr.findIndex(x => x.email === u.email) === idx);
        fs.writeFileSync(USERS_FILE, JSON.stringify(unique, null, 2), 'utf8');
    } catch (e) {
        console.warn('Could not write persistedUsers.json:', e.message);
    }
};

// Helper to load registered users from persisted file
const loadPersistedUsers = () => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const raw = fs.readFileSync(USERS_FILE, 'utf8');
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                list.forEach(u => {
                    memoryUsers.set(u.email, u);
                    if (u.id) memoryUsers.set(u.id, u);
                });
            }
        }
    } catch (e) {
        console.warn('Could not read persistedUsers.json:', e.message);
    }
};

loadPersistedUsers();

// In-memory OTP store fallback
const otpStore = new Map();
const registerOtpStore = new Map();

// Ensure DB connection is active before queries
const ensureDb = async () => {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        return true;
    }
    try {
        const conn = await connectDB();
        return Boolean(conn && mongoose.connection && mongoose.connection.readyState === 1);
    } catch (e) {
        return false;
    }
};

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Helper to save OTP to MongoDB (cross-serverless shared store) and in-memory map
const saveOtpDocument = async (email, otp, type = 'register') => {
    const norm = (email || '').toLowerCase().trim();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const store = type === 'register' ? registerOtpStore : otpStore;
    store.set(norm, { otp: String(otp).trim(), expiresAt: expiresAt.getTime(), verified: false });

    await ensureDb();
    if (isDbConnected()) {
        try {
            await Otp.deleteMany({ email: norm, type });
            await Otp.create({
                email: norm,
                otp: String(otp).trim(),
                type,
                verified: false,
                expiresAt
            });
        } catch (e) {
            console.warn(`[OTP] Could not persist ${type} OTP to MongoDB:`, e.message);
        }
    }
};

// Helper to verify OTP from MongoDB or in-memory fallback
const verifyOtpDocument = async (email, otp, type = 'register', markVerified = true) => {
    const norm = (email || '').toLowerCase().trim();
    const trimmedOtp = String(otp || '').trim();

    await ensureDb();
    if (isDbConnected()) {
        try {
            const doc = await Otp.findOne({ email: norm, type }).sort({ createdAt: -1 });
            if (doc) {
                if (Date.now() > new Date(doc.expiresAt).getTime()) {
                    await Otp.deleteMany({ email: norm, type });
                    return { valid: false, expired: true, message: 'Verification code has expired. Please request a new code.' };
                }
                if (doc.otp === trimmedOtp) {
                    if (markVerified) {
                        doc.verified = true;
                        await doc.save();
                    }
                    return { valid: true, doc };
                }
            }
        } catch (e) {
            console.warn(`[OTP] Error checking ${type} OTP in MongoDB:`, e.message);
        }
    }

    // In-memory store fallback
    const store = type === 'register' ? registerOtpStore : otpStore;
    const rec = store.get(norm);
    if (!rec) {
        return { valid: false, message: 'No verification code requested or it has expired. Please request a new code.' };
    }
    if (Date.now() > rec.expiresAt) {
        store.delete(norm);
        return { valid: false, expired: true, message: 'Verification code has expired. Please request a new code.' };
    }
    if (rec.otp !== trimmedOtp) {
        return { valid: false, message: 'Incorrect verification code. Please check your Gmail.' };
    }
    if (markVerified) {
        rec.verified = true;
    }
    return { valid: true, rec };
};

// Helper to generate JWT token (supports user object or id)
const generateToken = (userOrId) => {
    let payload = {};
    if (userOrId && typeof userOrId === 'object' && !(userOrId instanceof mongoose.Types.ObjectId)) {
        const userId = (userOrId._id || userOrId.id || userOrId).toString();
        const isAdmin = userOrId.role === 'Admin' || (userOrId.email && userOrId.email.toLowerCase().trim() === 'pranavvaitla2@gmail.com');
        payload = {
            id: userId,
            email: userOrId.email,
            name: userOrId.name,
            role: userOrId.role,
            doctorAccess: isAdmin ? false : Boolean(userOrId.doctorAccess || userOrId.role === 'Doctor')
        };
    } else {
        const userId = userOrId ? userOrId.toString() : '';
        payload = { id: userId };
    }
    return jwt.sign(
        payload,
        (process.env.JWT_SECRET || 'medical_care_jwt_super_secret_key_2026_secure').trim(),
        { expiresIn: '7d' }
    );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
    try {
        const { name, email, phone, password, role, otp } = req.body;

        // Validation (phone is optional)
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, and password.'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Email OTP Verification
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: '6-digit email verification code is required.'
            });
        }

        const otpCheck = await verifyOtpDocument(normalizedEmail, otp, 'register', true);
        if (!otpCheck.valid) {
            return res.status(400).json({
                success: false,
                message: otpCheck.message || 'Incorrect verification code. Please check your Gmail.'
            });
        }

        // Clean up OTP after successful verification
        registerOtpStore.delete(normalizedEmail);
        if (isDbConnected()) {
            try { await Otp.deleteMany({ email: normalizedEmail, type: 'register' }); } catch (e) {}
        }

        const userRole = 'Patient';
        const hasDoctorAccess = false;
        const cleanPhone = (phone && typeof phone === 'string') ? phone.trim() : '';

        await ensureDb();

        if (isDbConnected()) {
            // Check if user already exists
            const userExists = await User.findOne({
                $or: [
                    { email: normalizedEmail },
                    { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            });
            if (userExists) {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this email address already exists. Please sign in.'
                });
            }

            const user = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                phone: cleanPhone,
                password,
                role: userRole,
                doctorAccess: hasDoctorAccess
            });

            // Keep in-memory store in sync
            const memUserSync = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                doctorAccess: user.doctorAccess
            };
            memoryUsers.set(normalizedEmail, memUserSync);
            memoryUsers.set(memUserSync.id, memUserSync);
            savePersistedUsers();

            const token = generateToken(user._id);

            if (req.session) {
                req.session.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    doctorAccess: user.doctorAccess
                };
            }

            return res.status(201).json({
                success: true,
                message: 'User registered successfully!',
                token,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    doctorAccess: user.role === 'Admin' ? false : Boolean(user.doctorAccess || user.role === 'Doctor')
                }
            });
        }

        // In-memory fallback
        if (memoryUsers.has(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email address already exists. Please sign in.'
            });
        }

        const newId = 'usr_' + Date.now();
        const memUser = {
            id: newId,
            name: name.trim(),
            email: normalizedEmail,
            phone: cleanPhone,
            passwordHash: await bcrypt.hash(password, 10),
            role: userRole,
            doctorAccess: hasDoctorAccess
        };
        memoryUsers.set(normalizedEmail, memUser);
        memoryUsers.set(newId, memUser);
        savePersistedUsers();

        const token = generateToken(memUser);

        if (req.session) {
            req.session.user = {
                id: memUser.id,
                name: memUser.name,
                email: memUser.email,
                role: memUser.role,
                doctorAccess: memUser.doctorAccess
            };
        }

        return res.status(201).json({
            success: true,
            message: 'User registered successfully!',
            token,
            user: {
                id: memUser.id,
                name: memUser.name,
                email: memUser.email,
                phone: memUser.phone,
                role: memUser.role,
                doctorAccess: memUser.role === 'Admin' ? false : Boolean(memUser.doctorAccess || memUser.role === 'Doctor')
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Authenticate user & get token (supports Email, Phone, or Username)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
    try {
        const identifier = (req.body.email || req.body.username || req.body.phone || '').trim();
        const { password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email/phone and password.'
            });
        }

        const rawLower = identifier.toLowerCase();
        const digitsOnly = identifier.replace(/[^\d]/g, '');
        const phoneFormatted = digitsOnly.length === 10 ? digitsOnly : (digitsOnly.length > 10 ? digitsOnly.slice(-10) : '');

        let normalizedEmail = rawLower;
        let gmailNoDots = '';
        if (rawLower.includes('@gmail.com') || rawLower.includes('@googlemail.com')) {
            const [local, domain] = rawLower.split('@');
            gmailNoDots = local.replace(/\./g, '') + '@' + domain;
        }

        // Ensure database connection is active before performing lookup
        await ensureDb();

        if (isDbConnected()) {
            const searchConditions = [{ email: normalizedEmail }];
            try {
                const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchConditions.push({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
            } catch (e) {}

            if (gmailNoDots && gmailNoDots !== normalizedEmail) {
                searchConditions.push({ email: gmailNoDots });
                try {
                    const escaped = gmailNoDots.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    searchConditions.push({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
                } catch (e) {}
            }

            if (phoneFormatted) {
                searchConditions.push({ phone: phoneFormatted });
                searchConditions.push({ phone: `+91${phoneFormatted}` });
                searchConditions.push({ phone: { $regex: new RegExp(phoneFormatted + '$') } });
            }

            let user = await User.findOne({ $or: searchConditions });

            if (!user) {
                // Check if account exists in memoryUsers / preloads (e.g. demo accounts or persisted users)
                const fallbackMem = Array.from(memoryUsers.values()).find(u => {
                    if (!u) return false;
                    const uEmail = (u.email || '').toLowerCase().trim();
                    const uPhone = (u.phone || '').replace(/[^\d]/g, '');
                    return (uEmail === normalizedEmail) ||
                           (gmailNoDots && uEmail.replace(/\./g, '') === gmailNoDots) ||
                           (phoneFormatted && uPhone && uPhone.endsWith(phoneFormatted));
                });

                if (fallbackMem) {
                    try {
                        const isMatch = await bcrypt.compare(password, fallbackMem.passwordHash);
                        if (!isMatch) {
                            return res.status(401).json({
                                success: false,
                                message: 'Invalid credentials! Password does not match.'
                            });
                        }
                        user = await User.create({
                            name: fallbackMem.name,
                            email: fallbackMem.email,
                            phone: fallbackMem.phone || '',
                            password: password,
                            role: fallbackMem.role || 'Patient',
                            doctorAccess: Boolean(fallbackMem.doctorAccess)
                        });
                    } catch (e) {
                        console.warn('Could not auto-seed fallbackMem into DB:', e.message);
                    }
                }
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials! No account found with this email or mobile number. If you are new, please register first.'
                });
            } else {
                const isMatch = await user.matchPassword(password);
                if (!isMatch) {
                    // Check if account was registered via Google Sign-In
                    if (user.googleId || (user.avatar && user.avatar.includes('googleusercontent.com'))) {
                        return res.status(401).json({
                            success: false,
                            message: 'This account was registered using Google. Please click "Sign in with Google" above, or use "Forgot password" to set an email password.'
                        });
                    }
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials! Password does not match.'
                    });
                }
            }

            const token = generateToken(user);
            const isDoctorPermitted = user.role === 'Admin' ? false : Boolean(user.doctorAccess || user.role === 'Doctor');

            // Sync to in-memory store so subsequent requests in serverless keep warm
            const memUserSync = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                doctorAccess: isDoctorPermitted
            };
            memoryUsers.set(user.email, memUserSync);
            memoryUsers.set(memUserSync.id, memUserSync);

            if (req.session) {
                req.session.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    doctorAccess: isDoctorPermitted
                };
            }

            return res.status(200).json({
                success: true,
                message: 'Login successful!',
                token,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    doctorAccess: isDoctorPermitted
                }
            });
        }

        // In-memory fallback
        let memUser = Array.from(memoryUsers.values()).find(u => {
            if (!u) return false;
            const uEmail = (u.email || '').toLowerCase().trim();
            const uPhone = (u.phone || '').replace(/[^\d]/g, '');
            if (uEmail === normalizedEmail) return true;
            if (gmailNoDots && uEmail.replace(/\./g, '') === gmailNoDots) return true;
            if (phoneFormatted && uPhone && uPhone.endsWith(phoneFormatted)) return true;
            return false;
        });

        if (!memUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials! No account found with this email or mobile number. If you are new, please register first.'
            });
        }

        const isMatch = await bcrypt.compare(password, memUser.passwordHash);
        if (!isMatch) {
            if (memUser.googleId || (memUser.avatar && memUser.avatar.includes('googleusercontent.com'))) {
                return res.status(401).json({
                    success: false,
                    message: 'This account was registered using Google. Please click "Sign in with Google" above, or use "Forgot password" to set an email password.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials! Password does not match.'
            });
        }

        const token = generateToken(memUser);
        const isDoctorPermittedMem = memUser.role === 'Admin' ? false : Boolean(memUser.doctorAccess || memUser.role === 'Doctor');

        if (req.session) {
            req.session.user = {
                id: memUser.id,
                name: memUser.name,
                email: memUser.email,
                role: memUser.role,
                doctorAccess: isDoctorPermittedMem
            };
        }

        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: memUser.id,
                name: memUser.name,
                email: memUser.email,
                phone: memUser.phone,
                role: memUser.role,
                doctorAccess: isDoctorPermittedMem
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Log out user & clear session
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logoutUser = (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Could not log out, please try again.'
                });
            }
            res.clearCookie('connect.sid');
            return res.status(200).json({
                success: true,
                message: 'Logged out successfully!'
            });
        });
    } else {
        res.status(200).json({
            success: true,
            message: 'Logged out successfully!'
        });
    }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const targetId = req.user.id || req.user._id;
            const user = await User.findById(targetId).select('-password');
            if (user) {
                const u = user.toObject();
                u.doctorAccess = u.role === 'Admin' ? false : Boolean(user.doctorAccess || user.role === 'Doctor');
                const token = generateToken(u);
                return res.status(200).json({
                    success: true,
                    user: u,
                    token
                });
            }
        }

        // Memory Store Fallback
        const memUser = (req.user && req.user.id ? memoryUsers.get(req.user.id) : null) || 
                        (req.user && req.user.email ? memoryUsers.get(req.user.email) : null) || 
                        req.user || {};
        const u = { ...memUser };
        u.doctorAccess = u.role === 'Admin' ? false : Boolean(u.doctorAccess || u.role === 'Doctor');
        const token = generateToken(u);

        res.status(200).json({
            success: true,
            user: u,
            token
        });
    } catch (error) {
        next(error);
    }
};

const https = require('https');

// Helper to verify official Google GSI ID Token
const verifyGoogleToken = (credential) => {
    return new Promise((resolve) => {
        https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const payload = JSON.parse(data);
                    if (payload && payload.email) {
                        return resolve(payload);
                    }
                } catch (e) {}
                try {
                    const parts = credential.split('.');
                    if (parts.length >= 2) {
                        const base64Url = parts[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
                        return resolve(JSON.parse(jsonPayload));
                    }
                } catch (e) {}
                resolve({});
            });
        }).on('error', () => {
            try {
                const parts = credential.split('.');
                if (parts.length >= 2) {
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
                    return resolve(JSON.parse(jsonPayload));
                }
            } catch (e) {}
            resolve({});
        });
    });
};

/**
 * @desc    Authenticate user via Google (supports official GSI credential token OR direct real Gmail)
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = async (req, res, next) => {
    try {
        let { email, name, password, phone, googleId, picture, credential } = req.body;

        // If official Google GSI credential token was provided, decode and verify it
        if (credential) {
            try {
                const tokenData = await verifyGoogleToken(credential);
                if (tokenData && tokenData.email) {
                    email = tokenData.email;
                    name = name || tokenData.name || tokenData.given_name;
                    picture = picture || tokenData.picture;
                    googleId = googleId || tokenData.sub;
                }
            } catch (err) {
                console.error('Error verifying Google Token:', err);
            }
        }

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'A valid Google email address is required.'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const userName = name && name.trim() ? name.trim() : normalizedEmail.split('@')[0];
        const defaultRole = 'Patient';

        let existingUser = null;
        if (isDbConnected()) {
            existingUser = await User.findOne({ email: normalizedEmail });
        } else {
            existingUser = memoryUsers.get(normalizedEmail);
        }

        // IF NEW USER:
        if (!existingUser) {
            const cleanPhone = (phone && typeof phone === 'string') ? phone.trim() : '';

            // If user has not provided password or phone yet, prompt client to complete registration
            if (!password || !cleanPhone) {
                return res.status(200).json({
                    success: true,
                    isNewUser: true,
                    message: 'New user detected! Please provide your User Name, Password, and Phone Number to complete registration.',
                    email: normalizedEmail,
                    name: userName,
                    googleId: googleId || '',
                    picture: picture || ''
                });
            }

            // Client provided password and phone: validate fields
            const chosenName = (name && name.trim()) || userName;
            if (!chosenName || chosenName.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid user name (at least 2 characters).'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long.'
                });
            }

            const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
            if (digitsOnly.length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 10-digit mobile phone number.'
                });
            }

            const formattedPhone = digitsOnly.length === 10 ? digitsOnly : digitsOnly.slice(-10);

            let newUserObj = null;

            if (isDbConnected()) {
                const user = await User.create({
                    name: chosenName.trim(),
                    email: normalizedEmail,
                    phone: formattedPhone,
                    password: password, // Pre-save hook hashes with bcrypt
                    role: defaultRole,
                    googleId: googleId || '',
                    avatar: picture || ''
                });

                newUserObj = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone || formattedPhone,
                    role: user.role,
                    avatar: user.avatar || picture || ''
                };

                // Sync to in-memory store
                const memUserSync = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone || formattedPhone,
                    role: user.role,
                    doctorAccess: false
                };
                memoryUsers.set(normalizedEmail, memUserSync);
                memoryUsers.set(memUserSync.id, memUserSync);
                savePersistedUsers();
            } else {
                // In-memory fallback
                const passwordHash = await bcrypt.hash(password, 10);
                const newId = 'goog_' + Date.now();
                const user = {
                    id: newId,
                    name: chosenName.trim(),
                    email: normalizedEmail,
                    phone: formattedPhone,
                    passwordHash: passwordHash,
                    role: defaultRole,
                    avatar: picture || ''
                };
                memoryUsers.set(normalizedEmail, user);
                memoryUsers.set(newId, user);
                savePersistedUsers();

                newUserObj = user;
            }

            newUserObj.doctorAccess = newUserObj.role === 'Admin' ? false : Boolean(newUserObj.doctorAccess || newUserObj.role === 'Doctor');
            const token = generateToken(newUserObj);

            if (req.session) {
                req.session.user = {
                    id: newUserObj.id,
                    name: newUserObj.name,
                    email: newUserObj.email,
                    role: newUserObj.role,
                    doctorAccess: newUserObj.doctorAccess
                };
            }

            return res.status(201).json({
                success: true,
                isNewUser: false,
                message: 'Account created successfully! Welcome to Medical Care.',
                token,
                user: newUserObj
            });
        }

        // EXISTING USER: Log in immediately
        let userObj = null;
        if (isDbConnected()) {
            let updated = false;
            if (picture && !existingUser.avatar) {
                existingUser.avatar = picture;
                updated = true;
            }
            if (updated) {
                await existingUser.save();
            }

            userObj = {
                id: existingUser._id.toString(),
                name: existingUser.name,
                email: existingUser.email,
                phone: existingUser.phone || '',
                role: existingUser.role,
                avatar: existingUser.avatar || picture || ''
            };
        } else {
            if (picture) existingUser.avatar = picture;
            userObj = existingUser;
        }

        userObj.doctorAccess = userObj.role === 'Admin' ? false : Boolean(userObj.doctorAccess || userObj.role === 'Doctor');
        const token = generateToken(userObj);

        if (req.session) {
            req.session.user = {
                id: userObj.id,
                name: userObj.name,
                email: userObj.email,
                role: userObj.role,
                doctorAccess: userObj.doctorAccess
            };
        }

        return res.status(200).json({
            success: true,
            isNewUser: false,
            message: 'Google login successful!',
            token,
            user: userObj
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get public auth configuration
 * @route   GET /api/auth/config
 * @access  Public
 */
const getAuthConfig = (req, res) => {
    res.status(200).json({
        success: true,
        googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim()
    });
};

/**
 * @desc    Save Google Client ID in server memory (runtime only)
 * @route   POST /api/auth/google-client-id
 * @access  Private/Admin
 */
const updateGoogleClientId = async (req, res) => {
    try {
        const { googleClientId } = req.body;
        if (!googleClientId || !googleClientId.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid Google Client ID.'
            });
        }

        const trimmed = googleClientId.trim();
        process.env.GOOGLE_CLIENT_ID = trimmed;

        return res.status(200).json({
            success: true,
            message: 'Google Client ID updated in server memory successfully!',
            googleClientId: trimmed
        });
    } catch (err) {
        console.error('Error saving Google Client ID:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to save Google Client ID.'
        });
    }
};

/**
 * @desc    Request registration verification OTP
 * @route   POST /api/auth/send-register-otp
 * @access  Public
 */
const sendRegisterOtp = async (req, res, next) => {
    try {
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address.' });
        }
        const normalizedEmail = email.toLowerCase().trim();

        await ensureDb();

        // Check if user already exists
        let userExists = false;
        if (isDbConnected()) {
            const user = await User.findOne({
                $or: [
                    { email: normalizedEmail },
                    { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            });
            if (user) userExists = true;
        }
        if (!userExists && memoryUsers.has(normalizedEmail)) {
            userExists = true;
        }
        if (userExists) {
            return res.status(400).json({ success: false, message: 'An account with this email address already exists. Please sign in.' });
        }

        // Generate 6-digit random code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtpDocument(normalizedEmail, otp, 'register');

        // Send OTP email
        const emailResult = await sendOtpEmail({
            to: normalizedEmail,
            otp,
            name: name || 'Valued Patient'
        });

        console.log(`[Register OTP] Sent verification code to ${normalizedEmail}: ${otp} (Email Sent: ${emailResult.sent})`);

        return res.status(200).json({
            success: true,
            message: emailResult.sent 
                ? `A 6-digit verification code has been dispatched to your Gmail (${normalizedEmail}).`
                : `A 6-digit verification code has been generated for ${normalizedEmail}.`,
            emailSent: emailResult.sent,
            expiresIn: 600
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Request password reset OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address.' });
        }
        const normalizedEmail = email.toLowerCase().trim();

        await ensureDb();

        let userExists = false;
        if (isDbConnected()) {
            const user = await User.findOne({
                $or: [
                    { email: normalizedEmail },
                    { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            });
            if (user) userExists = true;
        }
        if (!userExists && memoryUsers.has(normalizedEmail)) {
            userExists = true;
        }

        if (!userExists) {
            return res.status(404).json({ success: false, message: 'No registered user found with this email address.' });
        }

        // Generate 6-digit random code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await saveOtpDocument(normalizedEmail, otp, 'forgot_password');

        // Determine user display name if available
        let userName = '';
        if (isDbConnected()) {
            const u = await User.findOne({ email: normalizedEmail });
            if (u && u.name) userName = u.name;
        }
        if (!userName && memoryUsers.has(normalizedEmail)) {
            const u = memoryUsers.get(normalizedEmail);
            if (u && u.name) userName = u.name;
        }

        // Send email via Gmail Nodemailer transporter
        const emailResult = await sendOtpEmail({
            to: normalizedEmail,
            otp,
            name: userName
        });

        console.log(`[Forgot Password OTP] Generated OTP for ${normalizedEmail}: ${otp} (Email Sent: ${emailResult.sent})`);

        return res.status(200).json({
            success: true,
            message: emailResult.sent 
                ? `A 6-digit verification code has been dispatched to your Gmail (${normalizedEmail}).`
                : `A 6-digit verification code has been generated for ${normalizedEmail}.`,
            emailSent: emailResult.sent,
            expiresIn: 600
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Verify 6-digit OTP code
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required.' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const check = await verifyOtpDocument(normalizedEmail, otp, 'forgot_password', true);

        if (!check.valid) {
            return res.status(400).json({
                success: false,
                message: check.message || 'Incorrect verification code. Please check your Gmail.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully!'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Reset password after OTP verification
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }
        const normalizedEmail = email.toLowerCase().trim();

        // Verify OTP again and check that it was marked verified or matches
        const check = await verifyOtpDocument(normalizedEmail, otp, 'forgot_password', false);
        if (!check.valid) {
            return res.status(400).json({
                success: false,
                message: check.message || 'Invalid or unverified OTP session. Please verify your OTP code first.'
            });
        }

        await ensureDb();

        if (isDbConnected()) {
            const user = await User.findOne({
                $or: [
                    { email: normalizedEmail },
                    { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                ]
            });
            if (user) {
                user.password = newPassword;
                await user.save();
            }
            try { await Otp.deleteMany({ email: normalizedEmail, type: 'forgot_password' }); } catch (e) {}
        }

        let memUser = memoryUsers.get(normalizedEmail);
        if (memUser) {
            memUser.passwordHash = await bcrypt.hash(newPassword, 10);
            memoryUsers.set(normalizedEmail, memUser);
            if (memUser.id) memoryUsers.set(memUser.id, memUser);
            savePersistedUsers();
        }

        otpStore.delete(normalizedEmail);
        return res.status(200).json({
            success: true,
            message: 'Your password has been successfully reset! You can now log in.'
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    registerUser,
    sendRegisterOtp,
    loginUser,
    logoutUser,
    getMe,
    googleAuth,
    getAuthConfig,
    updateGoogleClientId,
    forgotPassword,
    verifyOtp,
    resetPassword,
    memoryUsers,
    savePersistedUsers
};
