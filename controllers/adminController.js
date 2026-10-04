const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const BloodDonor = require('../models/BloodDonor');
const Medicine = require('../models/Medicine');
const WellnessRecord = require('../models/WellnessRecord');
const MedicalRecord = require('../models/MedicalRecord');

const {
    isDbConnected,
    memoryDoctors,
    memoryAppointments,
    memoryDonors,
    memoryMedicines,
    memoryWellness,
    memoryRecords,
    savePersistedDoctors
} = require('../data/memoryStore');

const { memoryUsers, savePersistedUsers } = require('./authController');

/**
 * @desc    Get system-wide metrics and stats for Admin Dashboard
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
const getAdminStats = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const [
                totalDoctors,
                totalAppointments,
                totalDonors,
                totalMedicines,
                totalWellness,
                totalRecords,
                totalUsers,
                appointments,
                users
            ] = await Promise.all([
                Doctor.countDocuments(),
                Appointment.countDocuments(),
                BloodDonor.countDocuments(),
                Medicine.countDocuments(),
                WellnessRecord.countDocuments(),
                MedicalRecord.countDocuments(),
                User.countDocuments(),
                Appointment.find()
                    .populate('patient', 'name email phone')
                    .populate('doctor', 'name specialization department')
                    .sort({ createdAt: -1 })
                    .limit(8),
                User.find().select('-password').sort({ createdAt: -1 }).limit(8)
            ]);

            // Status counts
            const confirmedApts = await Appointment.countDocuments({ status: { $regex: /^confirmed$/i } });
            const pendingApts = await Appointment.countDocuments({ status: { $regex: /^pending$/i } });
            const completedApts = await Appointment.countDocuments({ status: { $regex: /^completed$/i } });
            const cancelledApts = await Appointment.countDocuments({ status: { $regex: /^cancelled$/i } });

            // User roles
            const patientCount = await User.countDocuments({ role: 'Patient' });
            const doctorUserCount = await User.countDocuments({ role: 'Doctor' });
            const adminCount = await User.countDocuments({ role: 'Admin' });

            return res.status(200).json({
                success: true,
                stats: {
                    totalDoctors,
                    totalAppointments,
                    totalDonors,
                    totalMedicines,
                    totalWellness,
                    totalRecords,
                    totalUsers,
                    statusCounts: {
                        confirmed: confirmedApts,
                        pending: pendingApts,
                        completed: completedApts,
                        cancelled: cancelledApts
                    },
                    roles: {
                        patient: patientCount,
                        doctor: doctorUserCount,
                        admin: adminCount
                    }
                },
                recentAppointments: appointments,
                recentUsers: users
            });
        }

        // Memory Store Fallback
        const uniqueUsers = Array.from(memoryUsers.values())
            .filter((u, idx, arr) => arr.findIndex(x => x.email === u.email) === idx);

        const statusCounts = {
            confirmed: memoryAppointments.filter(a => (a.status || '').toLowerCase() === 'confirmed').length,
            pending: memoryAppointments.filter(a => (a.status || '').toLowerCase() === 'pending').length,
            completed: memoryAppointments.filter(a => (a.status || '').toLowerCase() === 'completed').length,
            cancelled: memoryAppointments.filter(a => (a.status || '').toLowerCase() === 'cancelled').length
        };

        const roles = {
            patient: uniqueUsers.filter(u => u.role === 'Patient').length,
            doctor: uniqueUsers.filter(u => u.role === 'Doctor').length,
            admin: uniqueUsers.filter(u => u.role === 'Admin').length
        };

        return res.status(200).json({
            success: true,
            stats: {
                totalDoctors: memoryDoctors.length,
                totalAppointments: memoryAppointments.length,
                totalDonors: memoryDonors.length,
                totalMedicines: memoryMedicines.length,
                totalWellness: memoryWellness.length,
                totalRecords: memoryRecords.length,
                totalUsers: uniqueUsers.length,
                statusCounts,
                roles
            },
            recentAppointments: memoryAppointments.slice(0, 8),
            recentUsers: uniqueUsers.slice(0, 8).map(u => ({
                _id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                role: u.role,
                createdAt: new Date()
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all users in the system
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const users = await User.find().select('-password').sort({ createdAt: -1 });
            const sanitized = users.map(u => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                role: u.role,
                doctorAccess: u.role === 'Admin' ? false : Boolean(u.doctorAccess || u.role === 'Doctor'),
                createdAt: u.createdAt || new Date()
            }));
            return res.status(200).json({
                success: true,
                count: sanitized.length,
                data: sanitized
            });
        }

        const uniqueUsers = Array.from(memoryUsers.values())
            .filter((u, idx, arr) => arr.findIndex(x => x.email === u.email) === idx)
            .map(u => ({
                _id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                role: u.role,
                doctorAccess: u.role === 'Admin' ? false : Boolean(u.doctorAccess || u.role === 'Doctor'),
                createdAt: u.createdAt || new Date()
            }));

        return res.status(200).json({
            success: true,
            count: uniqueUsers.length,
            data: uniqueUsers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a user role (Admin, Doctor, Patient)
 * @route   PUT /api/admin/users/:id/role
 * @access  Private (Admin)
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { role, name, phone, experience, image, specialization, department, hospital } = req.body;
        const validRoles = ['Patient', 'Doctor', 'Admin'];

        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role! Must be one of: ${validRoles.join(', ')}`
            });
        }

        const targetId = req.params.id;

        if (isDbConnected()) {
            const user = await User.findById(targetId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            user.role = role;
            if (role === 'Doctor') {
                user.doctorAccess = true;
                if (name && name.trim()) user.name = name.trim();
                if (phone && phone.trim()) user.phone = phone.trim();
                if (image && image.trim()) user.avatar = image.trim();

                // Create or update doctor record in DB
                const docEmail = user.email.toLowerCase().trim();
                let doc = await Doctor.findOne({ email: docEmail });
                const docName = (user.name || '').startsWith('Dr.') ? user.name : `Dr. ${user.name}`;
                const docPayload = {
                    name: docName,
                    email: docEmail,
                    phone: user.phone || phone || '',
                    experience: (experience && experience.trim()) ? experience.trim() : '5+ Yrs Exp',
                    image: (image && image.trim()) ? image.trim() : (user.avatar || '/images/male-doctor.jpg'),
                    specialization: (specialization && specialization.trim()) ? specialization.trim() : 'General Physician',
                    department: (department && department.trim()) ? department.trim() : 'Internal Medicine',
                    hospital: (hospital && hospital.trim()) ? hospital.trim() : 'AIIMS New Delhi'
                };

                if (doc) {
                    Object.assign(doc, docPayload);
                    await doc.save();
                } else {
                    await Doctor.create(docPayload);
                }
            } else {
                user.doctorAccess = false;
            }
            await user.save();

            if (req.session && req.session.user && req.session.user.id === user._id.toString()) {
                req.session.user.role = user.role;
                req.session.user.name = user.name;
                req.session.user.phone = user.phone;
                req.session.user.avatar = user.avatar;
                req.session.user.doctorAccess = user.doctorAccess;
            }

            return res.status(200).json({
                success: true,
                message: `User role updated to ${role} successfully!`,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatar: user.avatar,
                    doctorAccess: user.doctorAccess
                }
            });
        }

        // Memory Store Fallback
        let found = null;
        for (const [key, u] of memoryUsers.entries()) {
            if (u.id === targetId || key === targetId || u.email === targetId) {
                u.role = role;
                if (role === 'Doctor') {
                    u.doctorAccess = true;
                    if (name && name.trim()) u.name = name.trim();
                    if (phone && phone.trim()) u.phone = phone.trim();
                    if (image && image.trim()) u.avatar = image.trim();

                    // Create or update doctor record in memoryDoctors
                    const docEmail = u.email.toLowerCase().trim();
                    const existingDocIdx = memoryDoctors.findIndex(d => d.email && d.email.toLowerCase() === docEmail);
                    const docName = (u.name || '').startsWith('Dr.') ? u.name : `Dr. ${u.name}`;
                    const docPayload = {
                        name: docName,
                        email: docEmail,
                        phone: u.phone || phone || '',
                        experience: (experience && experience.trim()) ? experience.trim() : '5+ Yrs Exp',
                        image: (image && image.trim()) ? image.trim() : (u.avatar || '/images/male-doctor.jpg'),
                        specialization: (specialization && specialization.trim()) ? specialization.trim() : 'General Physician',
                        department: (department && department.trim()) ? department.trim() : 'Internal Medicine',
                        hospital: (hospital && hospital.trim()) ? hospital.trim() : 'AIIMS New Delhi',
                        availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
                        consultationFee: '₹500',
                        bio: ''
                    };

                    if (existingDocIdx !== -1) {
                        memoryDoctors[existingDocIdx] = { ...memoryDoctors[existingDocIdx], ...docPayload };
                    } else {
                        memoryDoctors.unshift({
                            _id: 'doc_' + Date.now(),
                            ...docPayload,
                            createdAt: new Date()
                        });
                    }
                    savePersistedDoctors();
                } else {
                    u.doctorAccess = false;
                    const docEmail = (u.email || '').toLowerCase().trim();
                    const existingDocIdx = memoryDoctors.findIndex(d => d.email && d.email.toLowerCase() === docEmail);
                    if (existingDocIdx !== -1) {
                        memoryDoctors.splice(existingDocIdx, 1);
                        savePersistedDoctors();
                    }
                }
                found = u;
            }
        }

        if (!found) {
            return res.status(404).json({
                success: false,
                message: 'User not found in memory store.'
            });
        }

        // Update all map keys to point to updated user
        memoryUsers.set(found.email, found);
        if (found.id) memoryUsers.set(found.id, found);

        savePersistedUsers();

        if (req.session && req.session.user && (req.session.user.id === found.id || req.session.user.email === found.email)) {
            req.session.user.role = found.role;
            req.session.user.name = found.name;
            req.session.user.phone = found.phone;
            req.session.user.avatar = found.avatar;
            req.session.user.doctorAccess = found.doctorAccess;
        }

        return res.status(200).json({
            success: true,
            message: `User role updated to ${role} successfully!`,
            user: {
                id: found.id,
                name: found.name,
                email: found.email,
                phone: found.phone,
                role: found.role,
                avatar: found.avatar,
                doctorAccess: found.doctorAccess
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Grant or Revoke Doctor Panel Permission
 * @route   PUT /api/admin/users/:id/doctor-permission
 * @access  Private (Admin)
 */
const toggleDoctorPermission = async (req, res, next) => {
    try {
        const { doctorAccess, name, phone, experience, image, specialization, department, hospital } = req.body;
        const grant = Boolean(doctorAccess);
        const targetId = req.params.id;

        if (isDbConnected()) {
            const user = await User.findById(targetId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            if (user.role === 'Admin') {
                user.doctorAccess = false;
            } else {
                user.doctorAccess = grant;
                if (grant) {
                    user.role = 'Doctor';
                    if (name && name.trim()) user.name = name.trim();
                    if (phone && phone.trim()) user.phone = phone.trim();
                    if (image && image.trim()) user.avatar = image.trim();

                    const docEmail = user.email.toLowerCase().trim();
                    let doc = await Doctor.findOne({ email: docEmail });
                    const docName = (user.name || '').startsWith('Dr.') ? user.name : `Dr. ${user.name}`;
                    const docPayload = {
                        name: docName,
                        email: docEmail,
                        phone: user.phone || phone || '',
                        experience: (experience && experience.trim()) ? experience.trim() : '5+ Yrs Exp',
                        image: (image && image.trim()) ? image.trim() : (user.avatar || '/images/male-doctor.jpg'),
                        specialization: (specialization && specialization.trim()) ? specialization.trim() : 'General Physician',
                        department: (department && department.trim()) ? department.trim() : 'Internal Medicine',
                        hospital: (hospital && hospital.trim()) ? hospital.trim() : 'AIIMS New Delhi'
                    };
                    if (doc) {
                        Object.assign(doc, docPayload);
                        await doc.save();
                    } else {
                        await Doctor.create(docPayload);
                    }
                } else if (user.role === 'Doctor') {
                    user.role = 'Patient';
                }
            }
            await user.save();

            if (req.session && req.session.user && req.session.user.id === user._id.toString()) {
                req.session.user.role = user.role;
                req.session.user.name = user.name;
                req.session.user.phone = user.phone;
                req.session.user.avatar = user.avatar;
                req.session.user.doctorAccess = user.doctorAccess;
            }

            return res.status(200).json({
                success: true,
                message: grant 
                    ? `Doctor Panel permission GRANTED to ${user.name}.` 
                    : `Doctor Panel permission REVOKED from ${user.name}.`,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    doctorAccess: user.doctorAccess
                }
            });
        }

        // Memory Store Fallback
        let found = null;
        for (const [key, u] of memoryUsers.entries()) {
            if (u.id === targetId || key === targetId || u.email === targetId) {
                if (u.role === 'Admin') {
                    u.doctorAccess = false;
                } else {
                    u.doctorAccess = grant;
                    if (grant) {
                        u.role = 'Doctor';
                        if (name && name.trim()) u.name = name.trim();
                        if (phone && phone.trim()) u.phone = phone.trim();
                        if (image && image.trim()) u.avatar = image.trim();

                        const docEmail = u.email.toLowerCase().trim();
                        const existingDocIdx = memoryDoctors.findIndex(d => d.email && d.email.toLowerCase() === docEmail);
                        const docName = (u.name || '').startsWith('Dr.') ? u.name : `Dr. ${u.name}`;
                        const docPayload = {
                            name: docName,
                            email: docEmail,
                            phone: u.phone || phone || '',
                            experience: (experience && experience.trim()) ? experience.trim() : '5+ Yrs Exp',
                            image: (image && image.trim()) ? image.trim() : (u.avatar || '/images/male-doctor.jpg'),
                            specialization: (specialization && specialization.trim()) ? specialization.trim() : 'General Physician',
                            department: (department && department.trim()) ? department.trim() : 'Internal Medicine',
                            hospital: (hospital && hospital.trim()) ? hospital.trim() : 'AIIMS New Delhi',
                            availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
                            consultationFee: '₹500',
                            bio: ''
                        };

                        if (existingDocIdx !== -1) {
                            memoryDoctors[existingDocIdx] = { ...memoryDoctors[existingDocIdx], ...docPayload };
                        } else {
                            memoryDoctors.unshift({
                                _id: 'doc_' + Date.now(),
                                ...docPayload,
                                createdAt: new Date()
                            });
                        }
                        savePersistedDoctors();
                    } else {
                        if (u.role === 'Doctor') u.role = 'Patient';
                        const docEmail = (u.email || '').toLowerCase().trim();
                        const existingDocIdx = memoryDoctors.findIndex(d => d.email && d.email.toLowerCase() === docEmail);
                        if (existingDocIdx !== -1) {
                            memoryDoctors.splice(existingDocIdx, 1);
                            savePersistedDoctors();
                        }
                    }
                }
                found = u;
            }
        }

        if (!found) {
            return res.status(404).json({
                success: false,
                message: 'User not found in memory store.'
            });
        }

        memoryUsers.set(found.email, found);
        if (found.id) memoryUsers.set(found.id, found);

        savePersistedUsers();

        if (req.session && req.session.user && (req.session.user.id === found.id || req.session.user.email === found.email)) {
            req.session.user.role = found.role;
            req.session.user.name = found.name;
            req.session.user.phone = found.phone;
            req.session.user.avatar = found.avatar;
            req.session.user.doctorAccess = found.doctorAccess;
        }

        return res.status(200).json({
            success: true,
            message: grant 
                ? `Doctor Panel permission GRANTED to ${found.name}.` 
                : `Doctor Panel permission REVOKED from ${found.name}.`,
            user: {
                id: found.id,
                name: found.name,
                email: found.email,
                role: found.role,
                doctorAccess: found.doctorAccess
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Prevent admin from deleting own account
        if (req.user && (req.user._id?.toString() === userId || req.user.id === userId || req.user.email === userId)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own active administrator account!'
            });
        }

        if (isDbConnected()) {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            await user.deleteOne();
            return res.status(200).json({
                success: true,
                message: 'User deleted successfully.'
            });
        }

        // Memory Store Fallback
        let deleted = false;
        for (const [key, u] of memoryUsers.entries()) {
            if (u.id === userId || u.email === userId || key === userId) {
                memoryUsers.delete(key);
                deleted = true;
            }
        }

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found in memory store.'
            });
        }

        savePersistedUsers();

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Upload doctor image (base64 data URL to file storage)
 * @route   POST /api/admin/upload-image
 * @access  Private (Admin, Doctor)
 */
const uploadDoctorImage = async (req, res, next) => {
    try {
        const { image, filename } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'No image data provided.'
            });
        }

        // If it's already an HTTP / HTTPS link or internal path, return as is
        if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/images/')) {
            return res.status(200).json({
                success: true,
                url: image
            });
        }

        // Match base64 data URI
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({
                success: false,
                message: 'Invalid base64 image data URI format.'
            });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Determine extension
        let ext = 'jpg';
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'doctors');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeName = (filename || 'doctor')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .substring(0, 20);
        const fileName = `doc_${Date.now()}_${safeName || 'avatar'}.${ext}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        const publicUrl = `/uploads/doctors/${fileName}`;

        return res.status(200).json({
            success: true,
            message: 'Doctor image uploaded successfully!',
            url: publicUrl
        });
    } catch (error) {
        console.error('Image Upload Error:', error);
        next(error);
    }
};

module.exports = {
    getAdminStats,
    getAllUsers,
    updateUserRole,
    toggleDoctorPermission,
    deleteUser,
    uploadDoctorImage
};
