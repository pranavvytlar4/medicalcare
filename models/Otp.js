const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        otp: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['register', 'forgot_password'],
            default: 'register'
        },
        verified: {
            type: Boolean,
            default: false
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// TTL index to automatically remove expired OTP records
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, type: 1 });

module.exports = mongoose.model('Otp', otpSchema);
