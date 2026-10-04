const mongoose = require('mongoose');

const wellnessRecordSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required']
        },
        mood: {
            type: String,
            required: [true, 'Please select or provide current mood'],
            trim: true
        },
        status: {
            type: String,
            required: [true, 'Please provide wellness status (e.g., Energetic, Normal, Stressed, Calm)'],
            trim: true
        },
        notes: {
            type: String,
            required: [true, 'Please provide wellness notes'],
            trim: true
        },
        date: {
            type: String,
            required: [true, 'Please provide record date']
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('WellnessRecord', wellnessRecordSchema);
