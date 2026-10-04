const express = require('express');
const router = express.Router();
const {
    getWellnessRecords,
    getWellnessById,
    createWellnessRecord,
    updateWellnessRecord,
    deleteWellnessRecord
} = require('../controllers/wellnessController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All wellness routes require authentication

router.route('/')
    .get(getWellnessRecords)
    .post(createWellnessRecord);

router.route('/:id')
    .get(getWellnessById)
    .put(updateWellnessRecord)
    .delete(deleteWellnessRecord);

module.exports = router;
