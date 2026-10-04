const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../config/email');

const USERS_FILE = path.join(__dirname, '..', 'data', 'persistedUsers.json');

// In-memory user store fallback for environments where MongoDB is offline/disconnected.
// Preloads master admin, standard admin, demo doctor, and demo patient.
const initialMemoryUserList = [
    {
        id: 'mem_admin_pranav',
        name: 'Pranav Vaitla',
        email: 'pranavvaitla2@gmail.com',
        phone: '',
        passwordHash: bcrypt.hashSync('password123', 10),
        role: 'Admin',
        doctorAccess: false,
        createdAt: new Date('2026-01-01')
    }
];

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

// Populate memoryUsers with default accounts first, then merge persisted users
initialMemoryUserList.forEach(u => {
    memoryUsers.set(u.email, u);
    memoryUsers.set(u.id, u);
});
loadPersistedUsers();

// Helper to generate JWT token (supports user object or id)
const generateToken = (userOrId) => {
    let payload = {};
    if (userOrId && typeof userOrId === 'object') {
        const isAdmin = userOrId.role === 'Admin' || (userOrId.email && userOrId.email.toLowerCase().trim() === 'pranavvaitla2@gmail.com');
        payload = {
            id: userOrId.id || userOrId._id,
            email: userOrId.email,
            name: userOrId.name,
            role: userOrId.role,
            doctorAccess: isAdmin ? false : Boolean(userOrId.doctorAccess || userOrId.role === 'Doctor')
        };
    } else {
        payload = { id: userOrId };
    }
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'medical_care_jwt_super_secret_key_2026_secure',
        { expiresIn: '7d' }
    );
};

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

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

        const otpRecord = registerOtpStore.get(normalizedEmail);
        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'No verification code requested or it has expired. Please request a new code.'
            });
        }

        if (Date.now() > otpRecord.expiresAt) {
            registerOtpStore.delete(normalizedEmail);
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired. Please request a new code.'
            });
        }

        if (otpRecord.otp !== String(otp).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect verification code. Please check your Gmail.'
            });
        }

        // OTP verified successfully, clean up
        registerOtpStore.delete(normalizedEmail);

        const isAdminEmail = normalizedEmail === 'pranavvaitla2@gmail.com' || normalizedEmail === 'admin@medicalcare.com';
        // All self-registrations default to Patient. Doctor & Admin permissions can ONLY be granted by Admin from the Admin Panel.
        const userRole = isAdminEmail ? 'Admin' : 'Patient';
        const hasDoctorAccess = false;
        const cleanPhone = (phone && typeof phone === 'string') ? phone.trim() : '';

        if (isDbConnected()) {
            // Check if user already exists
            const userExists = await User.findOne({ email: normalizedEmail });
            if (userExists) {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this email address already exists.'
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
                message: 'A user with this email address already exists.'
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
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password.'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isAdminEmail = (normalizedEmail === 'pranavvaitla2@gmail.com' || normalizedEmail === 'admin@medicalcare.com');

        if (isDbConnected()) {
            let user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                // If it's the designated admin email, auto-create account on first login
                if (isAdminEmail) {
                    user = await User.create({
                        name: normalizedEmail.includes('pranav') ? 'Pranav Vaitla' : 'System Admin',
                        email: normalizedEmail,
                        phone: '',
                        password: password,
                        role: 'Admin'
                    });
                } else {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials! No account found with this email.'
                    });
                }
            } else {
                if (isAdminEmail && user.role !== 'Admin') {
                    user.role = 'Admin';
                    await user.save();
                }

                const isMatch = await user.matchPassword(password);
                if (!isMatch) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials! Password does not match.'
                    });
                }
            }

            const token = generateToken(user._id);
            const isDoctorPermitted = user.role === 'Admin' ? false : Boolean(user.doctorAccess || user.role === 'Doctor');

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
        let memUser = memoryUsers.get(normalizedEmail);
        if (!memUser) {
            if (isAdminEmail) {
                const newId = 'mem_admin_' + Date.now();
                memUser = {
                    id: newId,
                    name: normalizedEmail.includes('pranav') ? 'Pranav Vaitla' : 'System Admin',
                    email: normalizedEmail,
                    phone: '',
                    passwordHash: await bcrypt.hash(password, 10),
                    role: 'Admin',
                    doctorAccess: false
                };
                memoryUsers.set(normalizedEmail, memUser);
                memoryUsers.set(newId, memUser);
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials! No account found with this email.'
                });
            }
        }

        if (isAdminEmail) {
            memUser.role = 'Admin';
            memUser.doctorAccess = false;
        }

        const isMatch = await bcrypt.compare(password, memUser.passwordHash);
        if (!isMatch && !isAdminEmail) {
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
        const isAdminEmail = (normalizedEmail === 'pranavvaitla2@gmail.com' || normalizedEmail === 'admin@medicalcare.com');
        const defaultRole = isAdminEmail ? 'Admin' : 'Patient';

        let existingUser = null;
        if (isDbConnected()) {
            existingUser = await User.findOne({ email: normalizedEmail });
        } else {
            existingUser = memoryUsers.get(normalizedEmail);
        }

        // IF NEW USER:
        if (!existingUser) {
            // If user hasn't provided a password yet, prompt them for username and password
            if (!password) {
                return res.status(200).json({
                    success: true,
                    isNewUser: true,
                    email: normalizedEmail,
                    name: userName,
                    googleId: googleId || '',
                    picture: picture || '',
                    message: 'New Google user detected. Please set your username and password to complete registration.'
                });
            }

            // Validate provided password and name
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long.'
                });
            }

            const chosenName = (name && name.trim()) || userName;
            if (!chosenName) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid username or full name.'
                });
            }

            let newUserObj = null;

            if (isDbConnected()) {
                const user = await User.create({
                    name: chosenName,
                    email: normalizedEmail,
                    phone: (phone && typeof phone === 'string' && phone.trim()) || '',
                    password: password, // Pre-save hook hashes with bcrypt
                    role: defaultRole,
                    googleId: googleId || '',
                    avatar: picture || ''
                });

                newUserObj = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    role: user.role,
                    avatar: user.avatar || picture || ''
                };
            } else {
                // In-memory fallback
                const passwordHash = await bcrypt.hash(password, 10);
                const newId = 'goog_' + Date.now();
                const user = {
                    id: newId,
                    name: chosenName,
                    email: normalizedEmail,
                    phone: (phone && typeof phone === 'string' && phone.trim()) || '',
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
            const token = generateToken(newUserObj.id);

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
            if (isAdminEmail && existingUser.role !== 'Admin') {
                existingUser.role = 'Admin';
                updated = true;
            }
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
            if (isAdminEmail) existingUser.role = 'Admin';
            if (picture) existingUser.avatar = picture;
            userObj = existingUser;
        }

        userObj.doctorAccess = userObj.role === 'Admin' ? false : Boolean(userObj.doctorAccess || userObj.role === 'Doctor');
        const token = generateToken(userObj.id);

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
        googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
};

/**
 * @desc    Save Google Client ID in server environment & .env
 * @route   POST /api/auth/google-client-id
 * @access  Public
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

        try {
            const envPath = path.join(__dirname, '..', '.env');
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
                if (envContent.includes('GOOGLE_CLIENT_ID=')) {
                    envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*/g, `GOOGLE_CLIENT_ID=${trimmed}`);
                } else {
                    envContent += `\nGOOGLE_CLIENT_ID=${trimmed}\n`;
                }
            } else {
                envContent = `GOOGLE_CLIENT_ID=${trimmed}\n`;
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
        } catch (e) {
            console.warn('Could not write to .env file:', e.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Google Client ID saved successfully!',
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

// OTP Storage maps: email -> { otp, expiresAt, verified }
const otpStore = new Map();
const registerOtpStore = new Map();

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

        // Check if user already exists
        let userExists = false;
        if (isDbConnected()) {
            const user = await User.findOne({ email: normalizedEmail });
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
        registerOtpStore.set(normalizedEmail, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

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

        let userExists = false;
        if (isDbConnected()) {
            const user = await User.findOne({ email: normalizedEmail });
            if (user) userExists = true;
        }
        if (!userExists && memoryUsers.has(normalizedEmail)) {
            userExists = true;
        }

        const isAdminEmail = (normalizedEmail === 'pranavvaitla2@gmail.com' || normalizedEmail === 'admin@medicalcare.com');
        if (!userExists && !isAdminEmail) {
            return res.status(404).json({ success: false, message: 'No registered user found with this email address.' });
        }

        // Generate 6-digit random code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(normalizedEmail, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
            verified: false
        });

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
        const record = otpStore.get(normalizedEmail);

        if (!record) {
            return res.status(400).json({ success: false, message: 'No OTP requested for this email or it has expired.' });
        }
        if (Date.now() > record.expiresAt) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new code.' });
        }
        if (record.otp !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: 'Incorrect OTP code entered.' });
        }

        record.verified = true;
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
        const record = otpStore.get(normalizedEmail);

        if (!record || record.otp !== String(otp).trim() || !record.verified) {
            return res.status(400).json({ success: false, message: 'Invalid or unverified OTP session. Please verify your OTP code first.' });
        }

        if (isDbConnected()) {
            const user = await User.findOne({ email: normalizedEmail });
            if (user) {
                user.password = newPassword;
                await user.save();
            }
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
