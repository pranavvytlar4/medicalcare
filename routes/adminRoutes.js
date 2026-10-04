const express = require('express');
const router = express.Router();
const {
    getAdminStats,
    getAllUsers,
    updateUserRole,
    toggleDoctorPermission,
    deleteUser,
    uploadDoctorImage
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes require authentication and Admin authorization
router.use(protect);

router.get('/stats', authorize('Admin'), getAdminStats);
router.get('/users', authorize('Admin'), getAllUsers);
router.put('/users/:id/role', authorize('Admin'), updateUserRole);
router.put('/users/:id/doctor-permission', authorize('Admin'), toggleDoctorPermission);
router.delete('/users/:id', authorize('Admin'), deleteUser);
router.post('/upload-image', authorize('Admin', 'Doctor'), uploadDoctorImage);

module.exports = router;
