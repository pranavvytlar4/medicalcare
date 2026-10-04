const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { isDbConnected, memoryAppointments, memoryDoctors } = require('../data/memoryStore');

/**
 * @desc    Get appointments (Patient sees own; Doctor/Admin sees all)
 * @route   GET /api/appointments
 * @access  Private
 */
const getAppointments = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let query = {};
            const hasDoctorAccess = req.user.doctorAccess === true || req.user.role === 'Doctor' || req.user.role === 'Admin';
            if (!hasDoctorAccess) {
                query.patient = req.user._id;
            }
            if (req.query.status && req.query.status !== 'All') {
                query.status = req.query.status;
            }
            if (req.query.doctorId) {
                query.doctor = req.query.doctorId;
            }
            if (req.query.search) {
                const s = req.query.search.trim();
                query.$or = [
                    { reason: { $regex: s, $options: 'i' } },
                    { appointmentDate: { $regex: s, $options: 'i' } }
                ];
            }

            const appointments = await Appointment.find(query)
                .populate('patient', 'name email phone')
                .populate('doctor', 'name specialization department phone image')
                .sort({ appointmentDate: 1, appointmentTime: 1, createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: appointments.length,
                data: appointments
            });
        }

        // Memory Store Fallback
        let userApts = [...memoryAppointments];
        const hasDoctorAccessMem = req.user.doctorAccess === true || req.user.role === 'Doctor' || req.user.role === 'Admin';
        if (!hasDoctorAccessMem) {
            const currentUserId = req.user._id || req.user.id;
            userApts = userApts.filter(a =>
                (a.patient && (a.patient._id === currentUserId || a.patient.id === currentUserId || a.patient.email === req.user.email))
            );
        }
        if (req.query.status && req.query.status !== 'All') {
            userApts = userApts.filter(a => a.status && a.status.toLowerCase() === req.query.status.toLowerCase());
        }
        if (req.query.doctorId) {
            userApts = userApts.filter(a => a.doctor && (a.doctor._id === req.query.doctorId || a.doctor.id === req.query.doctorId));
        }
        if (req.query.search) {
            const s = req.query.search.toLowerCase().trim();
            userApts = userApts.filter(a => {
                const pName = (a.patient?.name || '').toLowerCase();
                const pEmail = (a.patient?.email || '').toLowerCase();
                const pPhone = (a.patient?.phone || '').toLowerCase();
                const dName = (a.doctor?.name || '').toLowerCase();
                const reason = (a.reason || a.notes || '').toLowerCase();
                const date = (a.appointmentDate || a.date || '').toLowerCase();
                return pName.includes(s) || pEmail.includes(s) || pPhone.includes(s) || dName.includes(s) || reason.includes(s) || date.includes(s);
            });
        }

        return res.status(200).json({
            success: true,
            count: userApts.length,
            data: userApts
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single appointment
 * @route   GET /api/appointments/:id
 * @access  Private
 */
const getAppointmentById = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const appointment = await Appointment.findById(req.params.id)
                .populate('patient', 'name email phone')
                .populate('doctor', 'name specialization department phone');

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: `Appointment not found with id of ${req.params.id}`
                });
            }

            if (
                req.user.role === 'Patient' &&
                appointment.patient &&
                appointment.patient._id.toString() !== (req.user._id || req.user.id).toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this appointment.'
                });
            }

            return res.status(200).json({
                success: true,
                data: appointment
            });
        }

        const apt = memoryAppointments.find(a => a._id === req.params.id);
        if (!apt) {
            return res.status(404).json({
                success: false,
                message: `Appointment not found with id of ${req.params.id}`
            });
        }

        return res.status(200).json({
            success: true,
            data: apt
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Book a new appointment
 * @route   POST /api/appointments
 * @access  Private (Patient, Admin)
 */
const createAppointment = async (req, res, next) => {
    try {
        let doctor = req.body.doctor || req.body.doctorId || req.body.doctor_id;
        let date = req.body.date || req.body.appointmentDate || req.body.appointment_date;
        let time = req.body.time || req.body.appointmentTime || req.body.appointment_time;
        const notes = req.body.notes || req.body.reason || req.body.symptoms || 'General Consultation';

        // Auto-heal missing doctor
        if (!doctor && req.body.doctorName) {
            const found = memoryDoctors.find(d => d.name.toLowerCase().includes(req.body.doctorName.toLowerCase()));
            if (found) doctor = found._id;
        }
        if (!doctor) {
            doctor = memoryDoctors[0] ? memoryDoctors[0]._id : '';
        }

        // Auto-heal and normalize date (supports both YYYY-MM-DD and DD-MM-YYYY)
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
            const [d, m, y] = date.split('-');
            date = `${y}-${m}-${d}`;
        }

        // Auto-heal time
        if (!time) {
            time = '10:00 AM';
        }

        const patientId = req.user ? (req.user._id || req.user.id || 'mem_patient_001') : 'mem_patient_001';

        if (isDbConnected()) {
            let docExists = await Doctor.findById(doctor);
            if (!docExists) {
                docExists = await Doctor.findOne();
            }
            const docId = docExists ? docExists._id : doctor;

            const appointment = await Appointment.create({
                patient: patientId,
                doctor: docId,
                appointmentDate: date,
                appointmentTime: time,
                reason: notes,
                status: req.body.status || 'Pending',
                doctorNotes: req.body.doctorNotes || '',
                reminderNotes: req.body.reminderNotes || '',
                reminderSent: false
            });

            const populated = await Appointment.findById(appointment._id)
                .populate('patient', 'name email phone')
                .populate('doctor', 'name specialization department phone image');

            return res.status(201).json({
                success: true,
                message: 'Appointment booked successfully!',
                data: populated || appointment
            });
        }

        const selectedDoc = memoryDoctors.find(d => d._id === doctor) || memoryDoctors[0] || {
            _id: doctor || 'doc_specialist',
            name: req.body.doctorName || 'Specialist Doctor',
            specialization: 'General Physician',
            department: 'Consultation OPD'
        };

        const newApt = {
            _id: `apt_${Date.now()}`,
            patient: {
                _id: patientId,
                id: patientId,
                name: (req.user && req.user.name) ? req.user.name : 'Patient',
                email: (req.user && req.user.email) ? req.user.email : 'patient@hospital.in',
                phone: (req.user && req.user.phone) || ''
            },
            doctor: selectedDoc,
            date,
            appointmentDate: date,
            time,
            appointmentTime: time,
            notes: notes,
            reason: notes,
            status: req.body.status || 'Pending',
            doctorNotes: req.body.doctorNotes || '',
            reminderNotes: req.body.reminderNotes || '',
            reminderSent: false,
            createdAt: new Date()
        };

        memoryAppointments.unshift(newApt);

        return res.status(201).json({
            success: true,
            message: 'Appointment booked successfully!',
            data: newApt
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update appointment
 * @route   PUT /api/appointments/:id
 * @access  Private
 */
const updateAppointment = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            let appointment = await Appointment.findById(req.params.id);
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: `Appointment not found with id of ${req.params.id}`
                });
            }

            appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            })
            .populate('doctor', 'name specialization department phone image')
            .populate('patient', 'name email phone');

            return res.status(200).json({
                success: true,
                message: 'Appointment updated successfully!',
                data: appointment
            });
        }

        const idx = memoryAppointments.findIndex(a => a._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Appointment not found with id of ${req.params.id}`
            });
        }

        memoryAppointments[idx] = { ...memoryAppointments[idx], ...req.body };
        return res.status(200).json({
            success: true,
            message: 'Appointment updated successfully!',
            data: memoryAppointments[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Send / dispatch reminder for appointment
 * @route   POST /api/appointments/:id/reminder
 * @access  Private (Doctor, Admin)
 */
const sendReminder = async (req, res, next) => {
    try {
        const reminderNotes = req.body.reminderNotes || req.body.message || 'Appointment Reminder: Please arrive 15 minutes prior to your scheduled consultation time.';
        const reminderSentAt = new Date();

        if (isDbConnected()) {
            const appointment = await Appointment.findByIdAndUpdate(
                req.params.id,
                {
                    reminderSent: true,
                    reminderSentAt,
                    reminderNotes
                },
                { new: true }
            )
            .populate('patient', 'name email phone')
            .populate('doctor', 'name specialization department phone image');

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: `Appointment not found with id of ${req.params.id}`
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Appointment reminder dispatched to patient successfully!',
                data: appointment
            });
        }

        const idx = memoryAppointments.findIndex(a => a._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Appointment not found with id of ${req.params.id}`
            });
        }

        memoryAppointments[idx].reminderSent = true;
        memoryAppointments[idx].reminderSentAt = reminderSentAt;
        memoryAppointments[idx].reminderNotes = reminderNotes;

        return res.status(200).json({
            success: true,
            message: 'Appointment reminder dispatched to patient successfully!',
            data: memoryAppointments[idx]
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete appointment
 * @route   DELETE /api/appointments/:id
 * @access  Private
 */
const deleteAppointment = async (req, res, next) => {
    try {
        if (isDbConnected()) {
            const appointment = await Appointment.findById(req.params.id);
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: `Appointment not found with id of ${req.params.id}`
                });
            }

            await appointment.deleteOne();

            return res.status(200).json({
                success: true,
                message: 'Appointment cancelled successfully!'
            });
        }

        const idx = memoryAppointments.findIndex(a => a._id === req.params.id);
        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: `Appointment not found with id of ${req.params.id}`
            });
        }

        memoryAppointments.splice(idx, 1);
        return res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully!'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    sendReminder
};
