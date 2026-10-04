/**
 * ============================================================================
 * Client-Side JavaScript Validation Module (ES6)
 * Satisfies Q4 & Q5 (Arrow Functions, Regex, Destructuring, let/const)
 * ============================================================================
 */

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone regex pattern (10 digits)
const PHONE_REGEX = /^[0-9]{10}$/;

/**
 * Display error message on an input element
 */
const setFieldError = (inputElement, message) => {
    inputElement.classList.add('is-invalid');
    inputElement.classList.remove('is-valid');

    // Style custom select wrapper if present
    const wrapper = inputElement.closest('.input-group')?.querySelector('.curemed-select-wrapper') ||
                    inputElement.nextElementSibling?.classList?.contains('curemed-select-wrapper') ? inputElement.nextElementSibling : null;
    if (wrapper) {
        wrapper.classList.add('is-invalid');
        wrapper.classList.remove('is-valid');
    }

    const feedback = inputElement.closest('.mb-4, .col-md-6, .mb-3, .input-group')?.querySelector('.invalid-feedback') ||
                     inputElement.parentElement?.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.style.display = 'block';
    }
};

/**
 * Clear error and mark field as valid
 */
const clearFieldError = (inputElement) => {
    inputElement.classList.remove('is-invalid');
    inputElement.classList.add('is-valid');

    const wrapper = inputElement.closest('.input-group')?.querySelector('.curemed-select-wrapper') ||
                    inputElement.nextElementSibling?.classList?.contains('curemed-select-wrapper') ? inputElement.nextElementSibling : null;
    if (wrapper) {
        wrapper.classList.remove('is-invalid');
        wrapper.classList.add('is-valid');
    }

    const feedback = inputElement.closest('.mb-4, .col-md-6, .mb-3, .input-group')?.querySelector('.invalid-feedback') ||
                     inputElement.parentElement?.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.style.display = '';
    }
};

/**
 * Reset all validation states on a form
 */
const resetFormValidation = (formElement) => {
    const inputs = formElement.querySelectorAll('.is-invalid, .is-valid');
    inputs.forEach(el => el.classList.remove('is-invalid', 'is-valid'));
    const feedbacks = formElement.querySelectorAll('.invalid-feedback');
    feedbacks.forEach(f => {
        f.style.display = '';
    });
};

/**
 * Validate User Registration Form
 */
const validateRegistration = ({ name, email, phone, password, confirmPassword }) => {
    const errors = {};

    if (!name || name.trim().length < 2) {
        errors.name = 'Full name is required (at least 2 characters).';
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
        errors.email = 'Please provide a valid email address (e.g. user@example.com).';
    }

    if (!phone || !PHONE_REGEX.test(phone.trim().replace(/[-\s]/g, ''))) {
        errors.phone = 'Please provide a valid 10-digit phone number.';
    }

    if (!password || password.length < 6) {
        errors.password = 'Password must be at least 6 characters long.';
    }

    if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate User Login Form
 */
const validateLogin = ({ email, password }) => {
    const errors = {};

    const cleanInput = (email || '').trim();
    const isEmailValid = EMAIL_REGEX.test(cleanInput);
    const isPhoneValid = PHONE_REGEX.test(cleanInput.replace(/[^\d]/g, ''));

    if (!cleanInput || (!isEmailValid && !isPhoneValid)) {
        errors.email = 'Please enter a valid email address or 10-digit mobile number.';
    }

    if (!password || password.trim().length === 0) {
        errors.password = 'Password cannot be empty.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate Hospital Appointment Booking Form
 */
const validateAppointment = ({ doctor, appointmentDate, appointmentTime, reason }) => {
    const errors = {};

    if (!doctor || doctor.trim() === '') {
        errors.doctor = 'Please select a doctor.';
    }

    if (!appointmentDate) {
        errors.appointmentDate = 'Please select an appointment date.';
    } else {
        const selectedDate = new Date(appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            errors.appointmentDate = 'Appointment date cannot be in the past.';
        }
    }

    if (!appointmentTime || appointmentTime.trim() === '') {
        errors.appointmentTime = 'Please select an appointment time.';
    }

    if (!reason || reason.trim().length < 5) {
        errors.reason = 'Please state the reason for appointment (min 5 characters).';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate Blood Donor Registration Form
 */
const validateDonor = ({ name, age, bloodGroup, phone, location }) => {
    const errors = {};
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    if (!name || name.trim().length < 2) {
        errors.name = 'Donor name is required (min 2 characters).';
    }

    const numAge = Number(age);
    if (!age || isNaN(numAge) || numAge < 18 || numAge > 65) {
        errors.age = 'Donor age must be between 18 and 65 years.';
    }

    if (!bloodGroup || !validBloodGroups.includes(bloodGroup.trim())) {
        errors.bloodGroup = 'Please select a valid blood group (e.g. A+, O+, B+).';
    }

    if (!phone || !PHONE_REGEX.test(phone.trim().replace(/[-\s]/g, ''))) {
        errors.phone = 'Please provide a valid 10-digit phone number.';
    }

    if (!location || location.trim().length < 2) {
        errors.location = 'Please provide donor city or location.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate Medicine Reminder Form
 */
const validateMedicine = ({ medicineName, dosage, date, time }) => {
    const errors = {};

    if (!medicineName || medicineName.trim().length < 2) {
        errors.medicineName = 'Medicine name is required.';
    }

    if (!dosage || dosage.trim().length === 0) {
        errors.dosage = 'Dosage instruction is required (e.g., 500mg, 1 tablet).';
    }

    if (!date) {
        errors.date = 'Please specify reminder date.';
    }

    if (!time) {
        errors.time = 'Please specify reminder time.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate Mental Wellness Log Form
 */
const validateWellness = ({ mood, status, notes, date }) => {
    const errors = {};

    if (!mood || mood.trim() === '') {
        errors.mood = 'Please select or enter your current mood.';
    }

    if (!status || status.trim() === '') {
        errors.status = 'Please provide your wellness status (e.g., Energetic, Stressed, Calm).';
    }

    if (!notes || notes.trim().length < 5) {
        errors.notes = 'Please write at least a few words describing your wellness state.';
    }

    if (!date) {
        errors.date = 'Please select the record date.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate Medical Record Form
 */
const validateMedicalRecord = ({ diagnosis, medicalHistory, prescription, date }) => {
    const errors = {};

    if (!diagnosis || diagnosis.trim().length < 3) {
        errors.diagnosis = 'Please provide medical diagnosis / illness description.';
    }

    if (!medicalHistory || medicalHistory.trim().length < 3) {
        errors.medicalHistory = 'Please provide relevant medical history or allergies.';
    }

    if (!prescription || prescription.trim().length < 3) {
        errors.prescription = 'Please specify prescribed medications and advice.';
    }

    if (!date) {
        errors.date = 'Please specify the medical examination date.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Export to window object for frontend scripts
window.Validator = {
    setFieldError,
    clearFieldError,
    resetFormValidation,
    validateRegistration,
    validateLogin,
    validateAppointment,
    validateDonor,
    validateMedicine,
    validateWellness,
    validateMedicalRecord
};
