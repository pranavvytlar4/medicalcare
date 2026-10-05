/**
 * scripts/seedAdmin.js
 *
 * One-time script to create or promote an Admin account in MongoDB.
 * Run manually: node scripts/seedAdmin.js
 *
 * Required environment variables (in .env):
 *   ADMIN_EMAIL    — the admin email address
 *   ADMIN_PASSWORD — a strong password (min 12 chars recommended)
 *
 * Optional:
 *   ADMIN_NAME  — display name (defaults to "System Administrator")
 *   ADMIN_PHONE — phone number (defaults to empty string)
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL    = (process.env.ADMIN_EMAIL    || '').trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_NAME     = (process.env.ADMIN_NAME     || 'System Administrator').trim();
const ADMIN_PHONE    = (process.env.ADMIN_PHONE    || '').trim();
const MONGODB_URI    = process.env.MONGODB_URI;

function validateEnv() {
    const errors = [];
    if (!MONGODB_URI)    errors.push('MONGODB_URI is not set in .env');
    if (!ADMIN_EMAIL)    errors.push('ADMIN_EMAIL is not set in .env');
    if (!ADMIN_PASSWORD) errors.push('ADMIN_PASSWORD is not set in .env');
    if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 12)
        errors.push('ADMIN_PASSWORD must be at least 12 characters');
    if (ADMIN_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL))
        errors.push('ADMIN_EMAIL is not a valid email address');
    return errors;
}

async function seedAdmin() {
    const errors = validateEnv();
    if (errors.length > 0) {
        console.error('[seedAdmin] Validation failed:');
        errors.forEach(e => console.error(' -', e));
        process.exit(1);
    }

    console.log('[seedAdmin] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('[seedAdmin] Connected.');

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
        if (existing.role === 'Admin') {
            console.log(`[seedAdmin] Admin already exists: ${ADMIN_EMAIL}`);
        } else {
            existing.role = 'Admin';
            existing.doctorAccess = false;
            await existing.save();
            console.log(`[seedAdmin] Upgraded to Admin: ${ADMIN_EMAIL}`);
        }
    } else {
        await User.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            phone: ADMIN_PHONE,
            password: ADMIN_PASSWORD,   // hashed by User model pre-save hook
            role: 'Admin',
            doctorAccess: false
        });
        console.log(`[seedAdmin] Admin account created: ${ADMIN_EMAIL}`);
    }

    await mongoose.disconnect();
    console.log('[seedAdmin] Done.');
}

seedAdmin().catch(err => {
    console.error('[seedAdmin] Fatal error:', err.message);
    process.exit(1);
});
