const express = require('express');
const router = express.Router();
const {
    getMedicalRecords,
    getMedicalRecordById,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
} = require('../controllers/medicalRecordController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All medical records routes require authentication

router.route('/')
    .get(getMedicalRecords)
    .post(createMedicalRecord);

router.route('/:id')
    .get(getMedicalRecordById)
    .put(updateMedicalRecord)
    .delete(deleteMedicalRecord);

module.exports = router;
