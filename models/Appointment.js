const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Patient reference is required']
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: [true, 'Doctor reference is required']
        },
        appointmentDate: {
            type: String,
            required: [true, 'Appointment date is required']
        },
        appointmentTime: {
            type: String,
            required: [true, 'Appointment time is required']
        },
        reason: {
            type: String,
            required: [true, 'Reason for appointment is required'],
            trim: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
            default: 'Pending'
        },
        doctorNotes: {
            type: String,
            default: '',
            trim: true
        },
        reminderNotes: {
            type: String,
            default: '',
            trim: true
        },
        reminderSent: {
            type: Boolean,
            default: false
        },
        reminderSentAt: {
            type: Date
        },
        prescriptions: [
            {
                medicineName: { type: String, trim: true },
                dosage: { type: String, trim: true },
                frequency: { type: String, trim: true },
                time: { type: String, trim: true },
                instructions: { type: String, trim: true },
                prescribedAt: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
