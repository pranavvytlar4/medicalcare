const express = require('express');
const router = express.Router();
const {
    registerUser,
    sendRegisterOtp,
    loginUser,
    logoutUser,
    getMe,
    googleAuth,
    getAuthConfig,
    updateGoogleClientId,
    forgotPassword,
    verifyOtp,
    resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-register-otp', sendRegisterOtp);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/google', googleAuth);
router.get('/config', getAuthConfig);
router.post('/google-client-id', updateGoogleClientId);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
