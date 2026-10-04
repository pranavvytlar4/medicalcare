const express = require('express');
const router = express.Router();
const {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    sendReminder
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect); // All appointment routes require authentication

router.route('/')
    .get(getAppointments)
    .post(createAppointment);

router.post('/:id/reminder', authorize('Doctor', 'Admin'), sendReminder);

router.route('/:id')
    .get(getAppointmentById)
    .put(updateAppointment)
    .delete(deleteAppointment);

module.exports = router;
