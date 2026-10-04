const BloodDonor = require('../models/BloodDonor');
const { isDbConnected, memoryDonors } = require('../data/memoryStore');

/**
 * @desc    Get all blood donors with optional bloodGroup, location or search filter
 * @route   GET /api/donors
 * @access  Public
 */
const getDonors = async (req, res, next) => {
    try {
        const { bloodGroup, location, search } = req.query;

        if (isDbConnected()) {
            let query = {};
            if (bloodGroup) {
                query.bloodGroup = bloodGroup;
            }
            if (location) {
                query.location = { $regex: location, $options: 'i' };
            }
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } },
                    { bloodGroup: { $regex: search, $options: 'i' } }
                ];
            }

            const donors = await BloodDonor.find(query).sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: donors.length,
                data: donors
            });
        }

        // Memory Store Fallback
        let filtered = [...memoryDonors];
        if (bloodGroup) {
            filtered = filtered.filter(d => d.bloodGroup.toLowerCase() === bloodGroup.toLowerCase());
        }
        if (location) {
            filtered = filtered.filter(d => d.location.toLowerCase().includes(location.toLowerCase()));
        }
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(d =>
                d.name.toLowerCase().includes(s) ||
                d.location.toLowerCase().includes(s) ||
                d.bloodGroup.toLowerCase().includes(s)
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
 * @desc    Get single blood donor
 * @route   GET /api/donors/:id
 * @access  Public
 */
const getDonorById = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const donor = await BloodDonor.findById(req.params.id);
            if (!donor) {
                return res.status(404).json({
                    success: false,
                    message: `Donor not found with id of ${req.params.id}`
                });
            }
            return res.status(200).json({
                success: true,
                data: donor
            });
        }

        const donor = memoryDonors.find(d => d._id === req.params.id);
        if (!donor) {
            return res.status(404).json({
                success: false,
                message: `Donor not found with id of ${req.params.id}`
            });
        }
        return res.status(200).json({
            success: true,
            data: donor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Register a new blood donor
 * @route   POST /api/donors
 * @access  Public
 */
const registerDonor = async (req, res, next) => {
    try {
        const { name, bloodGroup, phone, email, location, age, availability } = req.body;

        if (!name || !bloodGroup || !phone || !location) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, bloodGroup, phone, location.'
            });
        }

        const donorEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now() % 1000}@donor.org`;

        if (isDbConnected()) {
            const existingDonor = await BloodDonor.findOne({ phone });
            if (existingDonor) {
                return res.status(400).json({
                    success: false,
                    message: 'A blood donor with this contact phone already exists.'
                });
            }

            const donor = await BloodDonor.create({
                name,
                age: age || 25,
                bloodGroup,
                phone,
                email: donorEmail,
                location,
                availability: availability || 'Available'
            });

            return res.status(201).json({
                success: true,
                message: 'Blood donor registered successfully!',
                data: donor
            });
        }

        const newDonor = {
            _id: `donor_${Date.now()}`,
            name,
            age: age || 25,
            bloodGroup,
            phone,
            email: donorEmail,
            location,
            availability: availability || 'Available',
            createdAt: new Date()
        };

        memoryDonors.unshift(newDonor);

        return res.status(201).json({
            success: true,
            message: 'Blood donor registered successfully!',
            data: newDonor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update blood donor details
 * @route   PUT /api/donors/:id
 * @access  Private (Admin)
 */
const updateDonor = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let donor = await BloodDonor.findById(req.params.id);
            if (!donor) {
                return res.status(404).json({
                    success: false,
                    message: `Donor not found with id of ${req.params.id}`
                });
            }

            donor = await BloodDonor.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            });

            return res.status(200).json({
                success: true,
                message: 'Donor updated successfully!',
                data: donor
            });
        }

        const idx = memoryDonors.findIndex(d => d._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Donor not found with id of ${req.params.id}`
            });
        }

        memoryDonors[idx] = { ...memoryDonors[idx], ...req.body };
        return res.status(200).json({
            success: true,
            message: 'Donor updated successfully!',
            data: memoryDonors[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete blood donor
 * @route   DELETE /api/donors/:id
 * @access  Private (Admin)
 */
const deleteDonor = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const donor = await BloodDonor.findById(req.params.id);
            if (!donor) {
                return res.status(404).json({
                    success: false,
                    message: `Donor not found with id of ${req.params.id}`
                });
            }

            await donor.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Blood donor deleted successfully!'
            });
        }

        const idx = memoryDonors.findIndex(d => d._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Donor not found with id of ${req.params.id}`
            });
        }

        memoryDonors.splice(idx, 1);
        return res.status(200).json({
            success: true,
            message: 'Blood donor deleted successfully!'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDonors,
    getDonorById,
    registerDonor,
    createDonor: registerDonor,
    updateDonor,
    deleteDonor
};
