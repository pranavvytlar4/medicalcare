const Medicine = require('../models/Medicine');
const { isDbConnected, memoryMedicines } = require('../data/memoryStore');

/**
 * @desc    Get medicine reminders for current user
 * @route   GET /api/medicines
 * @access  Private
 */
const getMedicines = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let query = {};
            if (req.user.role === 'Patient') {
                query.user = req.user._id;
            } else if (req.query.patientId) {
                query.user = req.query.patientId;
            }

            const medicines = await Medicine.find(query).sort({ date: 1, time: 1 });
            return res.status(200).json({
                success: true,
                count: medicines.length,
                data: medicines
            });
        }

        // Memory Store Fallback
        let meds = [...memoryMedicines];
        if (req.user && req.user.role === 'Patient') {
            meds = meds.filter(m => m.user === req.user._id || m.user === req.user.id || !m.user);
        } else if (req.query.patientId) {
            meds = meds.filter(m => m.user === req.query.patientId);
        }

        const normalized = meds.map(m => ({
            ...m,
            medicineName: m.medicineName || m.name,
            name: m.medicineName || m.name
        }));

        return res.status(200).json({
            success: true,
            count: normalized.length,
            data: normalized
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single medicine reminder by ID
 * @route   GET /api/medicines/:id
 * @access  Private
 */
const getMedicineById = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const medicine = await Medicine.findById(req.params.id);

            if (!medicine) {
                return res.status(404).json({
                    success: false,
                    message: `Medicine reminder not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role !== 'Admin' &&
                medicine.user.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this medicine reminder.'
                });
            }

            return res.status(200).json({
                success: true,
                data: medicine
            });
        }

        const med = memoryMedicines.find(m => m._id === req.params.id);
        if (!med) {
            return res.status(404).json({
                success: false,
                message: `Medicine reminder not found with id of ${req.params.id}`
            });
        }

        return res.status(200).json({
            success: true,
            data: med
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create new medicine reminder
 * @route   POST /api/medicines
 * @access  Private
 */
const createMedicine = async (req, res, next) => {
    try {
        const medicineName = req.body.medicineName || req.body.name;
        const { dosage, time, date } = req.body;
        const frequency = req.body.frequency || 'Weekly';
        const reminderDay = req.body.reminderDay || '';
        const instructions = req.body.instructions || '';

        if (!medicineName || !dosage || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Please provide medicine name, dosage, reminder date, and reminder time.'
            });
        }

        const targetUser = (req.user && (req.user.role === 'Doctor' || req.user.role === 'Admin') && req.body.patientId)
            ? req.body.patientId
            : (req.user ? (req.user._id || req.user.id) : 'mem_patient_001');

        if (isDbConnected()) {
            const medicine = await Medicine.create({
                user: targetUser,
                medicineName,
                dosage,
                date,
                time,
                frequency,
                reminderDay
            });

            return res.status(201).json({
                success: true,
                message: 'Medicine reminder created successfully!',
                data: medicine
            });
        }

        const newMed = {
            _id: `med_${Date.now()}`,
            user: targetUser,
            medicineName,
            name: medicineName,
            dosage,
            frequency,
            reminderDay,
            time,
            date,
            instructions,
            createdAt: new Date()
        };

        memoryMedicines.unshift(newMed);

        return res.status(201).json({
            success: true,
            message: 'Medicine reminder created successfully!',
            data: newMed
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update medicine reminder
 * @route   PUT /api/medicines/:id
 * @access  Private
 */
const updateMedicine = async (req, res, next) => {
    try {
        const medicineName = req.body.medicineName || req.body.name;
        const updateData = { ...req.body };
        if (medicineName) {
            updateData.medicineName = medicineName;
            updateData.name = medicineName;
        }

        if (isDbConnected()) {
            let medicine = await Medicine.findById(req.params.id);

            if (!medicine) {
                return res.status(404).json({
                    success: false,
                    message: `Medicine reminder not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role !== 'Admin' &&
                medicine.user.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this medicine reminder.'
                });
            }

            medicine = await Medicine.findByIdAndUpdate(req.params.id, updateData, {
                new: true,
                runValidators: true
            });

            return res.status(200).json({
                success: true,
                message: 'Medicine reminder updated successfully!',
                data: medicine
            });
        }

        const idx = memoryMedicines.findIndex(m => m._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Medicine reminder not found with id of ${req.params.id}`
            });
        }

        memoryMedicines[idx] = { ...memoryMedicines[idx], ...updateData };
        return res.status(200).json({
            success: true,
            message: 'Medicine reminder updated successfully!',
            data: memoryMedicines[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete medicine reminder
 * @route   DELETE /api/medicines/:id
 * @access  Private
 */
const deleteMedicine = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const medicine = await Medicine.findById(req.params.id);

            if (!medicine) {
                return res.status(404).json({
                    success: false,
                    message: `Medicine reminder not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role !== 'Admin' &&
                medicine.user.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this medicine reminder.'
                });
            }

            await medicine.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Medicine reminder deleted successfully!'
            });
        }

        const idx = memoryMedicines.findIndex(m => m._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Medicine reminder not found with id of ${req.params.id}`
            });
        }

        memoryMedicines.splice(idx, 1);
        return res.status(200).json({
            success: true,
            message: 'Medicine reminder deleted successfully!'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMedicines,
    getMedicineById,
    createMedicine,
    updateMedicine,
    deleteMedicine
};
