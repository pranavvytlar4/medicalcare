const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { isDbConnected, memoryDoctors, savePersistedDoctors } = require('../data/memoryStore');

/**
 * @desc    Get all doctors
 * @route   GET /api/doctors
 * @access  Public
 */
const getDoctors = async (req, res, next) => {
    try {
        const { specialization, search } = req.query;

        if (isDbConnected()) {
            let query = {};
            if (specialization) {
                query.specialization = { $regex: specialization, $options: 'i' };
            }
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { specialization: { $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' } }
                ];
            }

            const doctors = await Doctor.find(query).sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: doctors.length,
                data: doctors
            });
        }

        // Memory Store Fallback
        let filtered = [...memoryDoctors];
        if (specialization) {
            filtered = filtered.filter(d => d.specialization.toLowerCase().includes(specialization.toLowerCase()));
        }
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(d =>
                d.name.toLowerCase().includes(s) ||
                d.specialization.toLowerCase().includes(s) ||
                d.department.toLowerCase().includes(s)
            );
        }

        return res.status(200).json({
            success: true,
            count: filtered.length,
            data: filtered
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single doctor by ID
 * @route   GET /api/doctors/:id
 * @access  Public
 */
const getDoctorById = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const doctor = await Doctor.findById(req.params.id);
            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: `Doctor not found with id of ${req.params.id}`
                });
            }
            return res.status(200).json({
                success: true,
                data: doctor
            });
        }

        const doctor = memoryDoctors.find(d => d._id === req.params.id);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: `Doctor not found with id of ${req.params.id}`
            });
        }
        return res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new doctor
 * @route   POST /api/doctors
 * @access  Private (Doctor, Admin)
 */
const createDoctor = async (req, res, next) => {
    try {
        const {
            name,
            specialization,
            department,
            hospital,
            phone,
            email,
            image,
            experience,
            availability,
            consultationFee,
            bio
        } = req.body;

        if (!name || !specialization || !department || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required doctor details: name, specialization, department, phone, and email.'
            });
        }

        const docPayload = {
            name: name.trim(),
            specialization: specialization.trim(),
            department: department.trim(),
            hospital: hospital && hospital.trim() ? hospital.trim() : 'AIIMS New Delhi',
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            image: image && image.trim() ? image.trim() : '/images/male-doctor.jpg',
            experience: experience && experience.trim() ? experience.trim() : '5+ Yrs Exp',
            availability: availability && availability.trim() ? availability.trim() : 'Mon - Sat (09:00 AM - 05:00 PM)',
            consultationFee: consultationFee && consultationFee.trim() ? consultationFee.trim() : '₹500',
            bio: bio && bio.trim() ? bio.trim() : ''
        };

        if (isDbConnected()) {
            const doctor = await Doctor.create(docPayload);

            return res.status(201).json({
                success: true,
                message: 'Doctor added successfully!',
                data: doctor
            });
        }

        const newDoc = {
            _id: `doc_${Date.now()}`,
            ...docPayload,
            createdAt: new Date()
        };
        memoryDoctors.unshift(newDoc);
        savePersistedDoctors();

        return res.status(201).json({
            success: true,
            message: 'Doctor added successfully!',
            data: newDoc
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update doctor details
 * @route   PUT /api/doctors/:id
 * @access  Private (Doctor, Admin)
 */
const updateDoctor = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let doctor = await Doctor.findById(req.params.id);
            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: `Doctor not found with id of ${req.params.id}`
                });
            }

            doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            });

            return res.status(200).json({
                success: true,
                message: 'Doctor updated successfully!',
                data: doctor
            });
        }

        const idx = memoryDoctors.findIndex(d => d._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Doctor not found with id of ${req.params.id}`
            });
        }

        memoryDoctors[idx] = { ...memoryDoctors[idx], ...req.body };
        savePersistedDoctors();
        return res.status(200).json({
            success: true,
            message: 'Doctor updated successfully!',
            data: memoryDoctors[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete doctor
 * @route   DELETE /api/doctors/:id
 * @access  Private (Admin)
 */
const deleteDoctor = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const doctor = await Doctor.findById(req.params.id);
            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: `Doctor not found with id of ${req.params.id}`
                });
            }

            await doctor.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Doctor deleted successfully!'
            });
        }

        const idx = memoryDoctors.findIndex(d => d._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Doctor not found with id of ${req.params.id}`
            });
        }

        memoryDoctors.splice(idx, 1);
        savePersistedDoctors();
        return res.status(200).json({
            success: true,
            message: 'Doctor deleted successfully!'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get currently logged-in doctor's profile
 * @route   GET /api/doctors/profile/me
 * @access  Private (Doctor)
 */
const getDoctorProfile = async (req, res, next) => {
    try {
        const userEmail = (req.user?.email || '').toLowerCase().trim();

        if (isDbConnected()) {
            let doc = await Doctor.findOne({ email: userEmail });
            if (!doc) {
                return res.status(200).json({
                    success: true,
                    data: {
                        name: req.user.name,
                        email: req.user.email,
                        phone: req.user.phone || '',
                        image: req.user.avatar || '/images/male-doctor.jpg',
                        experience: '5+ Yrs Exp',
                        specialization: 'General Physician',
                        department: 'Internal Medicine',
                        hospital: 'AIIMS New Delhi'
                    }
                });
            }
            return res.status(200).json({ success: true, data: doc });
        }

        const doc = memoryDoctors.find(d => d.email && d.email.toLowerCase() === userEmail);
        return res.status(200).json({
            success: true,
            data: doc || {
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone || '',
                image: req.user.avatar || '/images/male-doctor.jpg',
                experience: '5+ Yrs Exp',
                specialization: 'General Physician',
                department: 'Internal Medicine',
                hospital: 'AIIMS New Delhi'
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update currently logged-in doctor's profile (photo, name, phone, experience)
 * @route   PUT /api/doctors/profile/me
 * @access  Private (Doctor)
 */
const updateDoctorProfile = async (req, res, next) => {
    try {
        const userEmail = (req.user?.email || '').toLowerCase().trim();
        const { name, phone, experience, image, specialization, department, hospital, bio, consultationFee, availability } = req.body;

        if (isDbConnected()) {
            if (name || phone || image) {
                const u = await User.findById(req.user._id || req.user.id);
                if (u) {
                    if (name && name.trim()) u.name = name.trim();
                    if (phone && phone.trim()) u.phone = phone.trim();
                    if (image && image.trim()) u.avatar = image.trim();
                    await u.save();
                }
            }

            let doc = await Doctor.findOne({ email: userEmail });
            const docPayload = {
                ...(name ? { name: name.trim() } : {}),
                ...(phone ? { phone: phone.trim() } : {}),
                ...(experience ? { experience: experience.trim() } : {}),
                ...(image ? { image: image.trim() } : {}),
                ...(specialization ? { specialization: specialization.trim() } : {}),
                ...(department ? { department: department.trim() } : {}),
                ...(hospital ? { hospital: hospital.trim() } : {}),
                ...(bio !== undefined ? { bio: bio.trim() } : {}),
                ...(consultationFee ? { consultationFee: consultationFee.trim() } : {}),
                ...(availability ? { availability: availability.trim() } : {})
            };

            if (doc) {
                Object.assign(doc, docPayload);
                await doc.save();
            } else {
                doc = await Doctor.create({
                    name: name || req.user.name,
                    email: userEmail,
                    phone: phone || req.user.phone || '',
                    experience: experience || '5+ Yrs Exp',
                    image: image || req.user.avatar || '/images/male-doctor.jpg',
                    specialization: specialization || 'General Physician',
                    department: department || 'Internal Medicine',
                    hospital: hospital || 'AIIMS New Delhi',
                    ...docPayload
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Doctor profile updated successfully!',
                data: doc
            });
        }

        // Memory Store Fallback
        const { memoryUsers, savePersistedUsers } = require('./authController');
        const memU = memoryUsers.get(req.user.id) || memoryUsers.get(userEmail);
        if (memU) {
            if (name && name.trim()) memU.name = name.trim();
            if (phone && phone.trim()) memU.phone = phone.trim();
            if (image && image.trim()) memU.avatar = image.trim();
            savePersistedUsers();
        }

        const idx = memoryDoctors.findIndex(d => d.email && d.email.toLowerCase() === userEmail);
        const docPayload = {
            ...(name ? { name: name.trim() } : {}),
            ...(phone ? { phone: phone.trim() } : {}),
            ...(experience ? { experience: experience.trim() } : {}),
            ...(image ? { image: image.trim() } : {}),
            ...(specialization ? { specialization: specialization.trim() } : {}),
            ...(department ? { department: department.trim() } : {}),
            ...(hospital ? { hospital: hospital.trim() } : {}),
            ...(bio !== undefined ? { bio: bio.trim() } : {}),
            ...(consultationFee ? { consultationFee: consultationFee.trim() } : {}),
            ...(availability ? { availability: availability.trim() } : {})
        };

        if (idx !== -1) {
            memoryDoctors[idx] = { ...memoryDoctors[idx], ...docPayload };
            savePersistedDoctors();
            return res.status(200).json({
                success: true,
                message: 'Doctor profile updated successfully!',
                data: memoryDoctors[idx]
            });
        } else {
            const newDoc = {
                _id: 'doc_' + Date.now(),
                name: name || req.user.name,
                email: userEmail,
                phone: phone || req.user.phone || '',
                experience: experience || '5+ Yrs Exp',
                image: image || req.user.avatar || '/images/male-doctor.jpg',
                specialization: specialization || 'General Physician',
                department: department || 'Internal Medicine',
                hospital: hospital || 'AIIMS New Delhi',
                availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
                consultationFee: '₹500',
                bio: '',
                ...docPayload,
                createdAt: new Date()
            };
            memoryDoctors.unshift(newDoc);
            savePersistedDoctors();
            return res.status(200).json({
                success: true,
                message: 'Doctor profile updated successfully!',
                data: newDoc
            });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorProfile,
    updateDoctorProfile
};
