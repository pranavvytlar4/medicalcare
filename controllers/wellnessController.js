const WellnessRecord = require('../models/WellnessRecord');
const { isDbConnected, memoryWellness } = require('../data/memoryStore');

/**
 * @desc    Get mental wellness records for current user
 * @route   GET /api/wellness
 * @access  Private
 */
const getWellnessRecords = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let query = {};
            if (req.user.role !== 'Admin') {
                query.user = req.user._id;
            }

            const records = await WellnessRecord.find(query).sort({ date: -1, createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: records.length,
                data: records
            });
        }

        // Memory Store Fallback
        let logs = [...memoryWellness];
        if (req.user && req.user.role !== 'Admin') {
            logs = logs.filter(w => w.user === req.user._id || w.user === req.user.id || !w.user);
        }

        return res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single wellness record by ID
 * @route   GET /api/wellness/:id
 * @access  Private
 */
const getWellnessById = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const record = await WellnessRecord.findById(req.params.id);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: `Wellness record not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role !== 'Admin' &&
                record.user.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this wellness record.'
                });
            }

            return res.status(200).json({
                success: true,
                data: record
            });
        }

        const log = memoryWellness.find(w => w._id === req.params.id);
        if (!log) {
            return res.status(404).json({
                success: false,
                message: `Wellness record not found with id of ${req.params.id}`
            });
        }

        return res.status(200).json({
            success: true,
            data: log
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Log a new mental wellness record
 * @route   POST /api/wellness
 * @access  Private
 */
const createWellnessRecord = async (req, res, next) => {
    try {
        const { mood, notes, energyLevel, sleepHours, date } = req.body;

        if (!mood || !energyLevel || !sleepHours) {
            return res.status(400).json({
                success: false,
                message: 'Please provide mood, energyLevel, and sleepHours.'
            });
        }

        if (isDbConnected()) {
            const record = await WellnessRecord.create({
                user: req.user._id,
                mood,
                notes: notes || '',
                energyLevel,
                sleepHours,
                date: date || new Date()
            });

            return res.status(201).json({
                success: true,
                message: 'Wellness record logged successfully!',
                data: record
            });
        }

        const newLog = {
            _id: `wel_${Date.now()}`,
            user: req.user ? (req.user._id || req.user.id) : 'mem_patient_001',
            mood,
            notes: notes || '',
            energyLevel,
            sleepHours,
            date: date || new Date().toISOString().split('T')[0],
            createdAt: new Date()
        };

        memoryWellness.unshift(newLog);

        return res.status(201).json({
            success: true,
            message: 'Wellness record logged successfully!',
            data: newLog
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update wellness record
 * @route   PUT /api/wellness/:id
 * @access  Private
 */
const updateWellnessRecord = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let record = await WellnessRecord.findById(req.params.id);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: `Wellness record not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role !== 'Admin' &&
                record.user.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this wellness record.'
                });
            }

            record = await WellnessRecord.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            });

            return res.status(200).json({
                success: true,
                message: 'Wellness record updated successfully!',
                data: record
            });
        }

        const idx = memoryWellness.findIndex(w => w._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Wellness record not found with id of ${req.params.id}`
            });
        }

        memoryWellness[idx] = { ...memoryWellness[idx], ...req.body };
        return res.status(200).json({
            success: true,
            message: 'Wellness record updated successfully!',
            data: memoryWellness[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete wellness record
 * @route   DELETE /api/wellness/:id
 * @access  Private
 */
const deleteWellnessRecord = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const record = await WellnessRecord.findById(req.params.id);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: `Wellness record not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role !== 'Admin' &&
                record.user.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this wellness record.'
                });
            }

            await record.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Wellness record deleted successfully!'
            });
        }

        const idx = memoryWellness.findIndex(w => w._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Wellness record not found with id of ${req.params.id}`
            });
        }

        memoryWellness.splice(idx, 1);
        return res.status(200).json({
            success: true,
            message: 'Wellness record deleted successfully!'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getWellnessRecords,
    getWellnessById,
    createWellnessRecord,
    updateWellnessRecord,
    deleteWellnessRecord
};
