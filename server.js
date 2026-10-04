const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

// Initialize Express App
const app = express();

// Trust proxy for Vercel & cloud reverse proxies
app.set('trust proxy', 1);

// Ensure MongoDB is connected for incoming API requests in serverless environments
app.use(async (req, res, next) => {
    try {
        await connectDB();
    } catch (e) {
        // Fallback handled in connectDB
    }
    next();
});

// Body Parser Middleware (with generous limit for doctor photo uploads)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Enable CORS
app.use(cors());

// HTTP Request Logger
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Session Management (Express-Session)
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'medical_care_session_secret_key_2026_super',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Set to true if running over HTTPS
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }
    })
);

// Serve Static Frontend Files
const staticOptions = {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        }
    }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/image-slider-login', express.static(path.join(__dirname, 'public', 'image-slider-login'), staticOptions));
app.use('/project', express.static(path.join(__dirname, 'public', 'project'), staticOptions));

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/donors', require('./routes/donorRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/wellness', require('./routes/wellnessRoutes'));
app.use('/api/records', require('./routes/medicalRecordRoutes'));

// Root & Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'All-in-One Medical Care API Server is running healthy!',
        timestamp: new Date().toISOString()
    });
});

// Error Handling Middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

// Start Server if run directly
const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`🏥 All-in-One Medical Care Server running on port ${PORT}`);
        console.log(`🌐 Website URL: http://localhost:${PORT}`);
        console.log(`🛠️ Mode: ${process.env.NODE_ENV || 'development'}`);
        console.log(`=======================================================`);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
});

module.exports = app;
