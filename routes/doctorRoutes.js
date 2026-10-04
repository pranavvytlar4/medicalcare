const express = require('express');
const router = express.Router();
const {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorProfile,
    updateDoctorProfile
} = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/profile/me')
    .get(protect, authorize('Doctor'), getDoctorProfile)
    .put(protect, authorize('Doctor'), updateDoctorProfile);

router.route('/')
    .get(getDoctors)
    .post(protect, authorize('Doctor', 'Admin'), createDoctor);

router.route('/:id')
    .get(getDoctorById)
    .put(protect, authorize('Doctor', 'Admin'), updateDoctor)
    .delete(protect, authorize('Admin'), deleteDoctor);

module.exports = router;
