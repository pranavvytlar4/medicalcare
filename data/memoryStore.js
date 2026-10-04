const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DOCTORS_FILE = path.join(__dirname, 'persistedDoctors.json');
const USERS_FILE = path.join(__dirname, 'persistedUsers.json');

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Active Doctors collection - initialized clean without any default/mock doctors
const memoryDoctors = [];

const savePersistedDoctors = () => {
    try {
        fs.writeFileSync(DOCTORS_FILE, JSON.stringify(memoryDoctors, null, 2), 'utf8');
    } catch (e) {
        console.warn('Could not write persistedDoctors.json:', e.message);
    }
};

const loadPersistedDoctors = () => {
    try {
        if (fs.existsSync(DOCTORS_FILE)) {
            const raw = fs.readFileSync(DOCTORS_FILE, 'utf8');
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                // Ensure no old default/mock doctors (doc_001 to doc_006) linger
                const cleanList = list.filter(d => !d._id || !d._id.startsWith('doc_00'));
                memoryDoctors.length = 0;
                memoryDoctors.push(...cleanList);
            }
        }
    } catch (e) {
        console.warn('Could not read persistedDoctors.json:', e.message);
    }

    // Auto-sync any registered users that have role === 'Doctor' or doctorAccess === true
    try {
        if (fs.existsSync(USERS_FILE)) {
            const usersRaw = fs.readFileSync(USERS_FILE, 'utf8');
            const userList = JSON.parse(usersRaw);
            if (Array.isArray(userList)) {
                userList.forEach(u => {
                    if (u.role === 'Doctor' || (u.doctorAccess && u.role !== 'Admin')) {
                        const email = (u.email || '').toLowerCase().trim();
                        const exists = memoryDoctors.some(d => d.email && d.email.toLowerCase() === email);
                        if (!exists) {
                            const docName = (u.name || '').startsWith('Dr.') ? u.name : `Dr. ${u.name || 'Doctor'}`;
                            memoryDoctors.push({
                                _id: 'doc_' + (u.id || Date.now()),
                                name: docName,
                                email: email,
                                phone: u.phone || '',
                                experience: u.experience || '5+ Yrs Exp',
                                image: u.avatar || '/images/male-doctor.jpg',
                                specialization: u.specialization || 'General Physician',
                                department: u.department || 'Internal Medicine',
                                hospital: u.hospital || 'AIIMS New Delhi',
                                availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
                                consultationFee: '₹500',
                                bio: u.bio || '',
                                createdAt: new Date()
                            });
                        }
                    }
                });
            }
        }
    } catch (err) {
        console.warn('Could not sync doctors from persistedUsers.json:', err.message);
    }
};

loadPersistedDoctors();

// Active transactional collections initialized completely clean (no default mock records)
const memoryAppointments = [];
const memoryDonors = [];
const memoryMedicines = [];
const memoryWellness = [];
const memoryRecords = [];

module.exports = {
    isDbConnected,
    memoryDoctors,
    memoryAppointments,
    memoryDonors,
    memoryMedicines,
    memoryWellness,
    memoryRecords,
    savePersistedDoctors,
    loadPersistedDoctors
};

