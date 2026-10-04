const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Patient reference is required']
        },
        doctor: {
            type: String,
            required: [true, 'Doctor name or reference is required'],
            trim: true
        },
        diagnosis: {
            type: String,
            required: [true, 'Please provide diagnosis details'],
            trim: true
        },
        medicalHistory: {
            type: String,
            required: [true, 'Please provide relevant medical history'],
            trim: true
        },
        prescription: {
            type: String,
            required: [true, 'Please provide prescription and dosage details'],
            trim: true
        },
        date: {
            type: String,
            required: [true, 'Please provide medical record date']
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
