const express = require('express');
const router = express.Router();
const {
    getMedicines,
    getMedicineById,
    createMedicine,
    updateMedicine,
    deleteMedicine
} = require('../controllers/medicineController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All medicine reminder routes require authentication

router.route('/')
    .get(getMedicines)
    .post(createMedicine);

router.route('/:id')
    .get(getMedicineById)
    .put(updateMedicine)
    .delete(deleteMedicine);

module.exports = router;
