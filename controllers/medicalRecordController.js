const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const { isDbConnected, memoryRecords } = require('../data/memoryStore');

/**
 * @desc    Get medical records (Patient views own; Doctor/Admin views all)
 * @route   GET /api/records
 * @access  Private
 */
const getMedicalRecords = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let query = {};
            if (req.user.role === 'Patient') {
                query.patient = req.user._id;
            }

            const records = await MedicalRecord.find(query)
                .populate('patient', 'name email phone')
                .sort({ date: -1, createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: records.length,
                data: records
            });
        }

        // Memory Store Fallback
        let recs = [...memoryRecords];
        if (req.user && req.user.role === 'Patient') {
            recs = recs.filter(r =>
                (r.patient && (r.patient._id === req.user._id || r.patient.email === req.user.email)) ||
                !r.patient
            );
        }

        return res.status(200).json({
            success: true,
            count: recs.length,
            data: recs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single medical record by ID
 * @route   GET /api/records/:id
 * @access  Private
 */
const getMedicalRecordById = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const record = await MedicalRecord.findById(req.params.id).populate('patient', 'name email phone');

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: `Medical record not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role === 'Patient' &&
                record.patient &&
                record.patient._id.toString() !== req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this medical record.'
                });
            }

            return res.status(200).json({
                success: true,
                data: record
            });
        }

        const rec = memoryRecords.find(r => r._id === req.params.id);
        if (!rec) {
            return res.status(404).json({
                success: false,
                message: `Medical record not found with id of ${req.params.id}`
            });
        }

        return res.status(200).json({
            success: true,
            data: rec
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new medical record
 * @route   POST /api/records
 * @access  Private (Doctor, Admin, Patient)
 */
const createMedicalRecord = async (req, res, next) => {
    try {
        const { patient, diagnosis, treatment, doctorName, hospital, date, notes } = req.body;

        if (!diagnosis || !treatment || !doctorName || !date) {
            return res.status(400).json({
                success: false,
                message: 'Please provide diagnosis, treatment, doctorName, and date.'
            });
        }

        const targetPatientId = req.user.role === 'Patient' ? req.user._id : (patient || req.user._id);

        if (isDbConnected()) {
            const record = await MedicalRecord.create({
                patient: targetPatientId,
                diagnosis,
                treatment,
                doctorName,
                hospital: hospital || 'Medical Care General Hospital',
                date,
                notes: notes || ''
            });

            const populated = await MedicalRecord.findById(record._id).populate('patient', 'name email phone');

            return res.status(201).json({
                success: true,
                message: 'Medical record created successfully!',
                data: populated
            });
        }

        const newRec = {
            _id: `rec_${Date.now()}`,
            patient: {
                _id: targetPatientId,
                name: req.user.name,
                email: req.user.email
            },
            diagnosis,
            treatment,
            doctorName,
            hospital: hospital || 'Medical Care General Hospital',
            date,
            notes: notes || '',
            createdAt: new Date()
        };

        memoryRecords.unshift(newRec);

        return res.status(201).json({
            success: true,
            message: 'Medical record created successfully!',
            data: newRec
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update medical record
 * @route   PUT /api/records/:id
 * @access  Private (Doctor, Admin)
 */
const updateMedicalRecord = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let record = await MedicalRecord.findById(req.params.id);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: `Medical record not found with id of ${req.params.id}`
                });
            }

            record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            }).populate('patient', 'name email phone');

            return res.status(200).json({
                success: true,
                message: 'Medical record updated successfully!',
                data: record
            });
        }

        const idx = memoryRecords.findIndex(r => r._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Medical record not found with id of ${req.params.id}`
            });
        }

        memoryRecords[idx] = { ...memoryRecords[idx], ...req.body };
        return res.status(200).json({
            success: true,
            message: 'Medical record updated successfully!',
            data: memoryRecords[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete medical record
 * @route   DELETE /api/records/:id
 * @access  Private (Admin)
 */
const deleteMedicalRecord = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const record = await MedicalRecord.findById(req.params.id);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: `Medical record not found with id of ${req.params.id}`
                });
            }

            await record.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Medical record deleted successfully!'
            });
        }

        const idx = memoryRecords.findIndex(r => r._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Medical record not found with id of ${req.params.id}`
            });
        }

        memoryRecords.splice(idx, 1);
        return res.status(200).json({
            success: true,
            message: 'Medical record deleted successfully!'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMedicalRecords,
    getMedicalRecordById,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
};
