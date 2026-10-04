const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required']
        },
        medicineName: {
            type: String,
            required: [true, 'Please provide medicine name'],
            trim: true
        },
        dosage: {
            type: String,
            required: [true, 'Please provide dosage (e.g., 500mg, 1 tablet)'],
            trim: true
        },
        date: {
            type: String,
            required: [true, 'Please provide reminder date']
        },
        time: {
            type: String,
            required: [true, 'Please provide reminder time']
        },
        frequency: {
            type: String,
            default: 'Weekly',
            trim: true
        },
        reminderDay: {
            type: String,
            default: 'Mon',
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Medicine', medicineSchema);
