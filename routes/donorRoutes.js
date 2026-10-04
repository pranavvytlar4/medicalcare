const express = require('express');
const router = express.Router();
const {
    getDonors,
    getDonorById,
    createDonor,
    updateDonor,
    deleteDonor
} = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(getDonors)
    .post(protect, createDonor);

router.route('/:id')
    .get(getDonorById)
    .put(protect, updateDonor)
    .delete(protect, deleteDonor);

module.exports = router;
