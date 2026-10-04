const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide doctor name'],
            trim: true
        },
        specialization: {
            type: String,
            required: [true, 'Please provide doctor specialization'],
            trim: true
        },
        department: {
            type: String,
            required: [true, 'Please provide department'],
            trim: true
        },
        hospital: {
            type: String,
            default: 'AIIMS New Delhi',
            trim: true
        },
        phone: {
            type: String,
            required: [true, 'Please provide contact phone'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Please provide contact email'],
            lowercase: true,
            trim: true
        },
        image: {
            type: String,
            default: '/images/male-doctor.jpg'
        },
        experience: {
            type: String,
            default: '5+ Yrs Exp'
        },
        availability: {
            type: String,
            default: 'Mon - Sat (09:00 AM - 05:00 PM)'
        },
        consultationFee: {
            type: String,
            default: '₹500'
        },
        bio: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Doctor', doctorSchema);

