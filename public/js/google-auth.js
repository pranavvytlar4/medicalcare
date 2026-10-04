/**
 * ============================================================================
 * Medical Care Google Authentication Module
 * Supports:
 * 1. Real Gmail account sign-in / registration
 * 2. Official Google Identity Services (GSI) OAuth 2.0 Client Popup
 * 3. Asks for Username & Password when registering a NEW Google user!
 * ============================================================================
 */

(function () {
    const GOOGLE_MODAL_ID = 'medicalCareGoogleAuthModal';
    let cachedClientId = '';
    let pendingNewGoogleUserData = null;

    // Dynamically load Google Identity Services SDK
    function loadGoogleGSI() {
        if (!document.getElementById('google-gsi-client')) {
            const script = document.createElement('script');
            script.id = 'google-gsi-client';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                checkAndInitGSI();
            };
            document.head.appendChild(script);
        } else {
            checkAndInitGSI();
        }
    }

    // Check if client ID is configured on backend
    async function fetchAuthConfig() {
        try {
            const res = await fetch('/api/auth/config');
            const data = await res.json();
            if (data.success && data.googleClientId) {
                cachedClientId = String(data.googleClientId).trim();
                checkAndInitGSI();
            }
        } catch (e) {
            console.warn('Could not fetch auth config:', e);
        }
    }

    // Initialize official Google Identity Services if client ID is available
    function checkAndInitGSI() {
        if (window.google && window.google.accounts && cachedClientId) {
            try {
                window.google.accounts.id.initialize({
                    client_id: cachedClientId,
                    callback: handleRealGoogleCredential,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });

                // Render the official Google Sign-In Button directly
                const gsiContainer = document.getElementById('googleGsiButtonContainer');
                if (gsiContainer) {
                    window.google.accounts.id.renderButton(gsiContainer, {
                        theme: 'outline',
                        size: 'large',
                        width: 380,
                        shape: 'pill',
                        text: 'continue_with',
                        logo_alignment: 'left'
                    });

                    // Hide fallback button once official Google button is mounted
                    const fallbackBtn = document.getElementById('googleSignUpBtn') || document.getElementById('googleSignInBtn');
                    if (fallbackBtn) {
                        fallbackBtn.style.display = 'none';
                    }
                }

                // Also trigger Google One-Tap prompt
                try {
                    window.google.accounts.id.prompt();
                } catch (e) {
                    console.log('Google prompt:', e);
                }
            } catch (err) {
                console.warn('GSI Init Notice:', err);
            }
        }
    }

    // Callback when Google returns a verified real credential token
    async function handleRealGoogleCredential(response) {
        if (!response || !response.credential) return;
        const modalEl = document.getElementById(GOOGLE_MODAL_ID);
        const modalInstance = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
        await executeGoogleAuth({ credential: response.credential }, modalInstance);
    }

    // Inject the Modal into DOM
    function injectGoogleModal() {
        if (document.getElementById(GOOGLE_MODAL_ID)) return;

        const modalHTML = `
        <div class="modal fade" id="${GOOGLE_MODAL_ID}" tabindex="-1" aria-labelledby="googleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 470px;">
                <div class="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                    <div class="modal-header border-0 pb-0 justify-content-end">
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body px-4 pt-0 pb-4 text-center">

                        <!-- Alert Box -->
                        <div id="googleAuthAlert" class="alert alert-danger d-none py-2 small text-start mb-3" role="alert"></div>

                        <!-- ============================================== -->
                        <!-- STEP 1: Main Google Login / Email Entry Screen -->
                        <!-- ============================================== -->
                        <div id="googleMainBody">
                            <!-- Google Logo Header -->
                            <div class="mb-3 d-inline-block">
                                <svg width="42" height="42" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                </svg>
                            </div>
                            <h4 class="fw-bold mb-1" id="googleModalLabel">Continue with Google</h4>
                            <p class="text-muted small mb-3">Sign in or register directly to <strong class="text-dark">Medical Care</strong> with your Google account</p>

                            <!-- Real Gmail Direct Login Form -->
                            <form id="realGmailForm" class="text-start bg-light p-3 rounded-4 mb-3 border">
                                <div class="mb-3">
                                    <label for="realGmailInput" class="form-label small fw-bold text-dark mb-1">
                                        <i class="bi bi-google text-danger me-1"></i> Your Real Gmail Address
                                    </label>
                                    <div class="input-group">
                                        <input type="email" class="form-control" id="realGmailInput" placeholder="yourname@gmail.com" required autocomplete="email">
                                    </div>
                                    <div class="form-text text-muted" style="font-size: 0.76rem;">Enter your personal or work Gmail address</div>
                                </div>

                                <div class="mb-3">
                                    <label for="realGmailName" class="form-label small fw-bold text-dark mb-1">
                                        <i class="bi bi-person-fill text-primary me-1"></i> Full Name (Optional)
                                    </label>
                                    <input type="text" class="form-control" id="realGmailName" placeholder="e.g. John Doe" autocomplete="name">
                                </div>

                                <button type="submit" id="realGmailSubmitBtn" class="google-auth-btn w-100 py-2 border-primary text-primary fw-bold">
                                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                            </form>

                            <!-- Accordion / Toggle for Official Google Cloud OAuth Client ID -->
                            <div class="card border rounded-3 p-3 text-start mb-3 bg-white">
                                <div class="d-flex align-items-center justify-content-between" role="button" id="toggleGoogleOAuthSetup">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-shield-lock text-primary fs-5"></i>
                                        <div>
                                            <div class="small fw-bold text-dark">Google Cloud OAuth Popup</div>
                                            <div class="text-muted" style="font-size: 0.72rem;">Have a Google Cloud Client ID? Enable browser popup</div>
                                        </div>
                                    </div>
                                    <i class="bi bi-chevron-down text-muted small" id="chevronOAuthSetup"></i>
                                </div>

                                <div id="oauthSetupContent" class="d-none mt-3 pt-3 border-top">
                                    <div class="mb-2">
                                        <label for="clientIdInput" class="form-label small fw-semibold text-secondary mb-1">Google OAuth Client ID</label>
                                        <input type="text" class="form-control form-control-sm font-monospace" id="clientIdInput" placeholder="xxxx-xxxx.apps.googleusercontent.com" value="${cachedClientId}">
                                    </div>
                                    <button type="button" id="saveClientIdBtn" class="btn btn-outline-primary btn-sm w-100 mb-2">
                                        Save & Launch Real Google Popup
                                    </button>
                                    <div class="text-muted" style="font-size: 0.72rem;">
                                        Get your free Client ID at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a> with origin <code>http://localhost:5000</code>.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ============================================== -->
                        <!-- STEP 2: New User - Ask Username and Password   -->
                        <!-- ============================================== -->
                        <div id="googleNewUserBody" class="d-none text-start">
                            <div class="text-center mb-3">
                                <div class="d-inline-flex align-items-center justify-content-center p-2 rounded-circle bg-primary-subtle text-primary mb-2" style="width: 52px; height: 52px;">
                                    <i class="bi bi-person-plus-fill fs-3"></i>
                                </div>
                                <h4 class="fw-bold mb-1 text-dark">Complete Your Registration</h4>
                                <p class="text-muted small mb-0">New Google account detected! Please choose your username and password to create your account.</p>
                            </div>

                            <!-- Verified Google Account Pill -->
                            <div class="d-flex align-items-center gap-2 p-2 px-3 rounded-pill bg-light border mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" class="flex-shrink-0">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                </svg>
                                <div class="small text-truncate flex-grow-1">
                                    <span class="text-muted">Account: </span><strong class="text-dark" id="googleNewUserEmailDisplay">user@gmail.com</strong>
                                </div>
                                <span class="badge bg-success-subtle text-success small rounded-pill">
                                    <i class="bi bi-patch-check-fill me-1"></i>Verified
                                </span>
                            </div>

                            <form id="googleNewUserForm" class="bg-light p-3 rounded-4 border">
                                <!-- Username / Full Name -->
                                <div class="mb-3">
                                    <label for="googleRegUsername" class="form-label small fw-bold text-dark mb-1">
                                        <i class="bi bi-person-fill text-primary me-1"></i> User Name / Full Name
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-person"></i></span>
                                        <input type="text" class="form-control border-start-0 ps-1" id="googleRegUsername" placeholder="e.g. John Doe" required autocomplete="name">
                                    </div>
                                    <div class="form-text text-muted" style="font-size: 0.74rem;">This name will appear on your medical records and appointments</div>
                                </div>

                                <!-- Password -->
                                <div class="mb-3">
                                    <label for="googleRegPassword" class="form-label small fw-bold text-dark mb-1">
                                        <i class="bi bi-lock-fill text-primary me-1"></i> Password
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-key"></i></span>
                                        <input type="password" class="form-control border-start-0 border-end-0 ps-1" id="googleRegPassword" placeholder="Minimum 6 characters" minlength="6" required autocomplete="new-password">
                                        <button class="btn btn-outline-secondary bg-white border-start-0 text-muted" type="button" id="toggleGoogleRegPass" tabindex="-1">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    </div>
                                    <div class="form-text text-muted" style="font-size: 0.74rem;">Use at least 6 characters</div>
                                </div>

                                <!-- Confirm Password -->
                                <div class="mb-3">
                                    <label for="googleRegConfirmPassword" class="form-label small fw-bold text-dark mb-1">
                                        <i class="bi bi-shield-lock-fill text-primary me-1"></i> Confirm Password
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-shield-check"></i></span>
                                        <input type="password" class="form-control border-start-0 border-end-0 ps-1" id="googleRegConfirmPassword" placeholder="Re-enter password" minlength="6" required autocomplete="new-password">
                                        <button class="btn btn-outline-secondary bg-white border-start-0 text-muted" type="button" id="toggleGoogleRegConfirmPass" tabindex="-1">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" id="googleCompleteRegBtn" class="btn btn-primary w-100 py-2 fw-bold rounded-3 shadow-sm">
                                    <span>Complete Registration & Sign In</span>
                                    <i class="bi bi-arrow-right ms-1"></i>
                                </button>

                                <div class="text-center mt-2">
                                    <button type="button" id="googleBackToLoginBtn" class="btn btn-link btn-sm text-secondary text-decoration-none">
                                        <i class="bi bi-arrow-left me-1"></i> Use a different Google account
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Google Loading Indicator -->
                        <div id="googleLoadingSpinner" class="d-none py-4">
                            <div class="spinner-border text-primary mb-3" role="status" style="width: 2.5rem; height: 2.5rem;"></div>
                            <div class="fw-bold text-dark fs-5" id="googleLoadingTitle">Connecting to Google...</div>
                            <div class="small text-muted" id="googleLoadingSub">Securing Medical Care session</div>
                        </div>

                        <div class="border-top pt-3 mt-3 text-muted small" style="font-size: 0.73rem;">
                            Protected by Medical Care Healthcare Security. By continuing, you agree to our <a href="#" class="text-decoration-none">Terms</a> and <a href="#" class="text-decoration-none">Privacy Policy</a>.
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupModalEvents();
    }

    // Perform API call to /api/auth/google
    async function executeGoogleAuth(payload, modalInstance) {
        const mainBody = document.getElementById('googleMainBody');
        const newUserBody = document.getElementById('googleNewUserBody');
        const spinner = document.getElementById('googleLoadingSpinner');
        const alertEl = document.getElementById('googleAuthAlert');
        const loadTitle = document.getElementById('googleLoadingTitle');
        const loadSub = document.getElementById('googleLoadingSub');

        if (mainBody) mainBody.classList.add('d-none');
        if (newUserBody) newUserBody.classList.add('d-none');
        if (spinner) spinner.classList.remove('d-none');
        if (alertEl) alertEl.classList.add('d-none');

        try {
            const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Google authentication failed');
            }

            // ========================================================
            // CASE 1: NEW USER - Ask for Username and Password!
            // ========================================================
            if (data.isNewUser) {
                pendingNewGoogleUserData = {
                    email: data.email,
                    name: data.name || '',
                    googleId: data.googleId || '',
                    picture: data.picture || ''
                };

                // Sync with on-page register.html fields if present
                const pageName = document.getElementById('name');
                const pageEmail = document.getElementById('email');
                if (pageName && !pageName.value) pageName.value = data.name || '';
                if (pageEmail && !pageEmail.value) pageEmail.value = data.email || '';

                if (spinner) spinner.classList.add('d-none');
                if (mainBody) mainBody.classList.add('d-none');

                // Populate and display Step 2 form
                const emailDisplay = document.getElementById('googleNewUserEmailDisplay');
                const usernameInput = document.getElementById('googleRegUsername');
                const passwordInput = document.getElementById('googleRegPassword');
                const confirmPasswordInput = document.getElementById('googleRegConfirmPassword');

                if (emailDisplay) emailDisplay.textContent = data.email;
                if (usernameInput) usernameInput.value = data.name || '';
                if (passwordInput) passwordInput.value = '';
                if (confirmPasswordInput) confirmPasswordInput.value = '';

                if (newUserBody) newUserBody.classList.remove('d-none');

                if (modalInstance) {
                    modalInstance.show();
                }

                setTimeout(() => {
                    if (usernameInput && !usernameInput.value) {
                        usernameInput.focus();
                    } else if (passwordInput) {
                        passwordInput.focus();
                    }
                }, 300);

                return;
            }

            // ========================================================
            // CASE 2: EXISTING USER or SUCCESSFUL REGISTRATION COMPLETE
            // ========================================================
            pendingNewGoogleUserData = null;

            // Save Auth session
            if (window.Auth && window.Auth.login) {
                window.Auth.login(data.token, data.user);
            } else {
                localStorage.setItem('medical_care_jwt_token', data.token);
                localStorage.setItem('medical_care_user_profile', JSON.stringify(data.user));
            }

            // Show rich success message
            if (spinner) {
                spinner.innerHTML = `
                    <div class="d-inline-flex p-3 rounded-circle bg-success-subtle text-success mb-2">
                        <i class="bi bi-check-circle-fill fs-1"></i>
                    </div>
                    <div class="fw-bold text-success fs-5">Welcome, ${data.user.name}!</div>
                    <div class="text-muted small mt-1">Logged in with <strong>${data.user.email}</strong></div>
                    <div class="badge bg-success-subtle text-success rounded-pill mt-2">Redirecting to Dashboard...</div>
                `;
            }

            setTimeout(() => {
                if (modalInstance) modalInstance.hide();
                window.location.href = 'dashboard.html';
            }, 900);

        } catch (err) {
            console.error('Google Auth Error:', err);
            if (spinner) spinner.classList.add('d-none');

            // If we were in new user registration mode, keep user on new user body
            if (pendingNewGoogleUserData && newUserBody) {
                newUserBody.classList.remove('d-none');
            } else if (mainBody) {
                mainBody.classList.remove('d-none');
            }

            if (alertEl) {
                alertEl.textContent = err.message || 'Authentication error. Please try again.';
                alertEl.classList.remove('d-none');
            }
        }
    }

    function setupModalEvents() {
        const modalEl = document.getElementById(GOOGLE_MODAL_ID);
        if (!modalEl) return;

        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

        // Step 1: Real Gmail form submission
        const form = document.getElementById('realGmailForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('realGmailInput').value.trim();
                const name = document.getElementById('realGmailName').value.trim();

                if (!email) {
                    if (window.showToast) {
                        window.showToast('Please enter your Gmail address', 'warning');
                    }
                    return;
                }

                executeGoogleAuth({ email, name }, modalInstance);
            });
        }

        // Step 2: New Google User Registration form submission
        const newUserForm = document.getElementById('googleNewUserForm');
        if (newUserForm) {
            newUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const alertEl = document.getElementById('googleAuthAlert');
                if (alertEl) alertEl.classList.add('d-none');

                const username = document.getElementById('googleRegUsername').value.trim();
                const password = document.getElementById('googleRegPassword').value;
                const confirmPassword = document.getElementById('googleRegConfirmPassword').value;

                if (!username || username.length < 2) {
                    if (alertEl) {
                        alertEl.textContent = 'Please enter a valid username (at least 2 characters).';
                        alertEl.classList.remove('d-none');
                    }
                    document.getElementById('googleRegUsername')?.focus();
                    return;
                }

                if (!password || password.length < 6) {
                    if (alertEl) {
                        alertEl.textContent = 'Password must be at least 6 characters long.';
                        alertEl.classList.remove('d-none');
                    }
                    document.getElementById('googleRegPassword')?.focus();
                    return;
                }

                if (password !== confirmPassword) {
                    if (alertEl) {
                        alertEl.textContent = 'Passwords do not match. Please re-enter.';
                        alertEl.classList.remove('d-none');
                    }
                    document.getElementById('googleRegConfirmPassword')?.focus();
                    return;
                }

                if (!pendingNewGoogleUserData || !pendingNewGoogleUserData.email) {
                    if (alertEl) {
                        alertEl.textContent = 'Google session expired. Please sign in again.';
                        alertEl.classList.remove('d-none');
                    }
                    return;
                }

                // Submit with chosen username and password to create account!
                executeGoogleAuth({
                    email: pendingNewGoogleUserData.email,
                    name: username,
                    password: password,
                    googleId: pendingNewGoogleUserData.googleId,
                    picture: pendingNewGoogleUserData.picture
                }, modalInstance);
            });
        }

        // Password Show/Hide Toggles
        const togglePassBtn = document.getElementById('toggleGoogleRegPass');
        const passInput = document.getElementById('googleRegPassword');
        if (togglePassBtn && passInput) {
            togglePassBtn.addEventListener('click', () => {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                togglePassBtn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
            });
        }

        const toggleConfirmPassBtn = document.getElementById('toggleGoogleRegConfirmPass');
        const confirmPassInput = document.getElementById('googleRegConfirmPassword');
        if (toggleConfirmPassBtn && confirmPassInput) {
            toggleConfirmPassBtn.addEventListener('click', () => {
                const isPass = confirmPassInput.type === 'password';
                confirmPassInput.type = isPass ? 'text' : 'password';
                toggleConfirmPassBtn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
            });
        }

        // Back to Login button
        const backBtn = document.getElementById('googleBackToLoginBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                pendingNewGoogleUserData = null;
                const mainBody = document.getElementById('googleMainBody');
                const newUserBody = document.getElementById('googleNewUserBody');
                const alertEl = document.getElementById('googleAuthAlert');
                if (alertEl) alertEl.classList.add('d-none');
                if (newUserBody) newUserBody.classList.add('d-none');
                if (mainBody) mainBody.classList.remove('d-none');
                document.getElementById('realGmailInput')?.focus();
            });
        }

        // Reset to Step 1 when modal is completely closed
        modalEl.addEventListener('hidden.bs.modal', () => {
            const mainBody = document.getElementById('googleMainBody');
            const newUserBody = document.getElementById('googleNewUserBody');
            const spinner = document.getElementById('googleLoadingSpinner');
            const alertEl = document.getElementById('googleAuthAlert');
            if (mainBody) mainBody.classList.remove('d-none');
            if (newUserBody) newUserBody.classList.add('d-none');
            if (spinner) spinner.classList.add('d-none');
            if (alertEl) alertEl.classList.add('d-none');
        });

        // Toggle Google Cloud OAuth Client ID configuration
        const toggleOAuth = document.getElementById('toggleGoogleOAuthSetup');
        const oauthContent = document.getElementById('oauthSetupContent');
        const chevron = document.getElementById('chevronOAuthSetup');

        if (toggleOAuth && oauthContent) {
            toggleOAuth.addEventListener('click', () => {
                const isHidden = oauthContent.classList.contains('d-none');
                if (isHidden) {
                    oauthContent.classList.remove('d-none');
                    if (chevron) chevron.className = 'bi bi-chevron-up text-muted small';
                } else {
                    oauthContent.classList.add('d-none');
                    if (chevron) chevron.className = 'bi bi-chevron-down text-muted small';
                }
            });
        }

        // Save Google Client ID and launch official Google Prompt
        const saveClientIdBtn = document.getElementById('saveClientIdBtn');
        const clientIdInput = document.getElementById('clientIdInput');

        if (saveClientIdBtn && clientIdInput) {
            saveClientIdBtn.addEventListener('click', async () => {
                const clientId = clientIdInput.value.trim();
                if (!clientId) {
                    if (window.showToast) {
                        window.showToast('Please enter a valid Google OAuth Client ID', 'warning');
                    }
                    return;
                }

                saveClientIdBtn.disabled = true;
                saveClientIdBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Connecting...';

                try {
                    const res = await fetch('/api/auth/google-client-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ googleClientId: clientId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        cachedClientId = clientId;
                        saveClientIdBtn.className = 'btn btn-success btn-sm w-100 mb-2';
                        saveClientIdBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Saved! Initializing Google...';

                        // Initialize Google SDK
                        checkAndInitGSI();

                        setTimeout(() => {
                            if (window.google && window.google.accounts) {
                                try {
                                    window.google.accounts.id.prompt();
                                } catch (e) {
                                    console.warn('Google prompt notice:', e);
                                }
                            }
                        }, 500);
                    }
                } catch (err) {
                    if (window.showToast) {
                        window.showToast('Could not save Google Client ID.', 'danger');
                    }
                    saveClientIdBtn.disabled = false;
                    saveClientIdBtn.textContent = 'Save & Launch Real Google Popup';
                }
            });
        }
    }

    // Open Modal
    function openGoogleLoginModal() {
        // If official GSI is active and client ID is ready, trigger Google's native one-tap or prompt first
        if (window.google && window.google.accounts && cachedClientId) {
            try {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        showModal();
                    }
                });
                return;
            } catch (e) {
                // Fall back to modal
            }
        }
        showModal();
    }

    function showModal() {
        injectGoogleModal();
        const modalEl = document.getElementById(GOOGLE_MODAL_ID);
        if (modalEl) {
            const mainBody = document.getElementById('googleMainBody');
            const newUserBody = document.getElementById('googleNewUserBody');
            const spinner = document.getElementById('googleLoadingSpinner');
            const alertEl = document.getElementById('googleAuthAlert');
            if (mainBody) mainBody.classList.remove('d-none');
            if (newUserBody) newUserBody.classList.add('d-none');
            if (spinner) spinner.classList.add('d-none');
            if (alertEl) alertEl.classList.add('d-none');

            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();

            setTimeout(() => {
                document.getElementById('realGmailInput')?.focus();
            }, 350);
        }
    }

    // Init on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        loadGoogleGSI();
        fetchAuthConfig();
        injectGoogleModal();

        const googleButtons = document.querySelectorAll('#googleSignUpBtn, #googleSignInBtn, .btn-google-trigger');
        googleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openGoogleLoginModal();
            });
        });
    });

    window.GoogleAuth = {
        openModal: openGoogleLoginModal,
        executeAuth: executeGoogleAuth
    };
})();
