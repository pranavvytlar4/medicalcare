const mongoose = require('mongoose');

const bloodDonorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide donor name'],
            trim: true
        },
        age: {
            type: Number,
            required: [true, 'Please provide donor age'],
            min: [18, 'Donor must be at least 18 years old'],
            max: [65, 'Donor age cannot exceed 65 years']
        },
        bloodGroup: {
            type: String,
            required: [true, 'Please select a blood group'],
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        },
        phone: {
            type: String,
            required: [true, 'Please provide donor phone number'],
            trim: true
        },
        location: {
            type: String,
            required: [true, 'Please provide city/location'],
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('BloodDonor', bloodDonorSchema);
