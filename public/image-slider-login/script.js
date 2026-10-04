/**
 * ============================================================================
 * Image Slider Login Component - Pure Vanilla JavaScript
 * Recreating React Slider State & Framer Motion with Standard Web APIs
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons if available via CDN
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    /* ------------------------------------------------------------------------
       1. Image Slider Controller
       ------------------------------------------------------------------------ */
    const slides = document.querySelectorAll('.slider-section .slide');
    const indicators = document.querySelectorAll('.slider-indicators .indicator');
    const totalSlides = slides.length;
    const SLIDE_DURATION = 4000; // 4 seconds auto-advance requirement

    let currentSlideIndex = 0;
    let autoSlideTimer = null;

    /**
     * Switch to specific slide by index
     * @param {number} newIndex - Target slide index
     */
    function goToSlide(newIndex) {
        // Normalize index within range [0, totalSlides - 1]
        const targetIndex = (newIndex + totalSlides) % totalSlides;

        if (targetIndex === currentSlideIndex) return;

        // Deactivate current slide & indicator
        slides[currentSlideIndex].classList.remove('active');
        indicators[currentSlideIndex].classList.remove('active');
        indicators[currentSlideIndex].setAttribute('aria-selected', 'false');

        // Activate new slide & indicator
        currentSlideIndex = targetIndex;
        slides[currentSlideIndex].classList.add('active');
        indicators[currentSlideIndex].classList.add('active');
        indicators[currentSlideIndex].setAttribute('aria-selected', 'true');
    }

    /**
     * Advance to next slide in continuous loop
     */
    function nextSlide() {
        goToSlide(currentSlideIndex + 1);
    }

    /**
     * Advance to previous slide in continuous loop
     */
    function prevSlide() {
        goToSlide(currentSlideIndex - 1);
    }

    /**
     * Start automatic slide rotation
     */
    function startAutoSlide() {
        stopAutoSlide();
        autoSlideTimer = setInterval(nextSlide, SLIDE_DURATION);
    }

    /**
     * Stop automatic slide rotation
     */
    function stopAutoSlide() {
        if (autoSlideTimer !== null) {
            clearInterval(autoSlideTimer);
            autoSlideTimer = null;
        }
    }

    /**
     * Reset timer when user manually interacts
     */
    function resetAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }

    // Attach click listeners to indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            goToSlide(index);
            resetAutoSlide();
        });

        // Keyboard arrow navigation on indicators
        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextSlide();
                indicators[currentSlideIndex].focus();
                resetAutoSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
                indicators[currentSlideIndex].focus();
                resetAutoSlide();
            }
        });
    });

    // Pause auto slide on mouse enter, resume on mouse leave
    const sliderContainer = document.getElementById('sliderContainer');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', stopAutoSlide);
        sliderContainer.addEventListener('mouseleave', startAutoSlide);
    }

    // Start auto slide loop
    startAutoSlide();

    /* ------------------------------------------------------------------------
       2. Password Visibility Toggle
       ------------------------------------------------------------------------ */
    const passwordInput = document.getElementById('passwordInput');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

            // Swap eye / eye-off icon
            togglePasswordBtn.innerHTML = isPassword 
                ? '<i data-lucide="eye-off" class="toggle-icon" aria-hidden="true"></i>'
                : '<i data-lucide="eye" class="toggle-icon" aria-hidden="true"></i>';

            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });
    }

    /* ------------------------------------------------------------------------
       3. Form Validation & Submission Feedback
       ------------------------------------------------------------------------ */
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('emailInput');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const feedbackAlert = document.getElementById('loginFeedback');
    const submitBtn = document.getElementById('submitBtn');

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showFieldError(input, errorElement, message) {
        const group = input.closest('.form-group');
        if (group) group.classList.add('has-error');
        if (errorElement) errorElement.textContent = message;
    }

    function clearFieldError(input, errorElement) {
        const group = input.closest('.form-group');
        if (group) group.classList.remove('has-error');
        if (errorElement) errorElement.textContent = '';
    }

    // Clear error on input focus / typing
    if (emailInput && emailError) {
        emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
    }
    if (passwordInput && passwordError) {
        passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Clear past feedback
            feedbackAlert.className = 'feedback-alert';
            feedbackAlert.textContent = '';

            let hasErrors = false;
            const emailVal = emailInput.value.trim();
            const passwordVal = passwordInput.value;

            // Validate email
            if (!emailVal) {
                showFieldError(emailInput, emailError, 'Email address is required');
                hasErrors = true;
            } else if (!validateEmail(emailVal)) {
                showFieldError(emailInput, emailError, 'Please enter a valid email address');
                hasErrors = true;
            } else {
                clearFieldError(emailInput, emailError);
            }

            // Validate password
            if (!passwordVal) {
                showFieldError(passwordInput, passwordError, 'Password is required');
                hasErrors = true;
            } else if (passwordVal.length < 6) {
                showFieldError(passwordInput, passwordError, 'Password must be at least 6 characters');
                hasErrors = true;
            } else {
                clearFieldError(passwordInput, passwordError);
            }

            if (hasErrors) return;

            // Simulate login submission with button loading state
            submitBtn.disabled = true;
            const originalBtnHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                <span class="btn-text">Logging in...</span>
                <span class="btn-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
            `;

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
                if (window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons();
                }

                feedbackAlert.className = 'feedback-alert success';
                feedbackAlert.textContent = `Welcome back! Logged in as ${emailVal}`;
            }, 1000);
        });
    }

    /* ------------------------------------------------------------------------
       4. Social Login Feedback Simulation (Google & Apple)
       ------------------------------------------------------------------------ */
    const googleBtn = document.getElementById('googleBtn');
    const appleBtn = document.getElementById('appleBtn');

    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            feedbackAlert.className = 'feedback-alert success';
            feedbackAlert.textContent = 'Redirecting to Google authentication...';
        });
    }

    if (appleBtn) {
        appleBtn.addEventListener('click', () => {
            feedbackAlert.className = 'feedback-alert success';
            feedbackAlert.textContent = 'Redirecting to Apple ID authentication...';
        });
    }

    /* ------------------------------------------------------------------------
       5. Forgot Password & Sign Up Clicks
       ------------------------------------------------------------------------ */
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            feedbackAlert.className = 'feedback-alert error';
            feedbackAlert.textContent = 'Password reset instructions have been sent to your email if registered.';
        });
    }

    const signUpLink = document.getElementById('signUpLink');
    if (signUpLink) {
        signUpLink.addEventListener('click', (e) => {
            e.preventDefault();
            feedbackAlert.className = 'feedback-alert success';
            feedbackAlert.textContent = 'Redirecting to account creation page...';
        });
    }
});

// Dynamic keyframe for inline spinner
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleSheet);
