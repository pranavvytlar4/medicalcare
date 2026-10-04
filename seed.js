const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const BloodDonor = require('./models/BloodDonor');
const Medicine = require('./models/Medicine');
const WellnessRecord = require('./models/WellnessRecord');
const MedicalRecord = require('./models/MedicalRecord');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_care_db');
        console.log('MongoDB Connected for Seeding...');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const seedData = async () => {
    await connectDB();

    try {
        // Clear existing collections
        await User.deleteMany();
        await Doctor.deleteMany();
        await Appointment.deleteMany();
        await BloodDonor.deleteMany();
        await Medicine.deleteMany();
        await WellnessRecord.deleteMany();
        await MedicalRecord.deleteMany();

        console.log('Cleared existing database records...');

        // 1. Create Users (Patient, Doctor, Admin)
        // 1. Create Real Master Administrator
        const pranavAdmin = await User.create({
            name: 'Pranav Vaitla',
            email: 'pranavvaitla2@gmail.com',
            phone: '9876543210',
            password: 'password123',
            role: 'Admin',
            doctorAccess: false
        });

        console.log('Real Master Admin created...');

        // 2. Clear any default doctors (doctors are created dynamically by Admin or onboarding)
        console.log('Zero default mock doctors initialized...');

        console.log('\n=============================================');
        console.log('DATABASE SETUP COMPLETED (CLEAN REAL DATA)');
        console.log('  Admin: pranavvaitla2@gmail.com / password123');
        console.log('=============================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
