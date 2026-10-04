const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
    // If already connected, return existing connection
    if (mongoose.connection && mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    if (cachedConnection) {
        try {
            await cachedConnection;
            return mongoose.connection;
        } catch (e) {
            cachedConnection = null;
        }
    }

    try {
        mongoose.set('bufferCommands', false);
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_care_db';
        cachedConnection = mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
        });
        const conn = await cachedConnection;
        console.log(`[MongoDB Connected] Host: ${conn.connection.host}, Database: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.warn(`[MongoDB Offline] Active memory store fallback enabled: ${error.message}`);
        cachedConnection = null;
        return null;
    }
};

module.exports = connectDB;
