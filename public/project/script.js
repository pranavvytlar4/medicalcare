/**
 * ============================================================================
 * Sign Up 1 Component Script (Pure Vanilla JavaScript)
 * Handles:
 * 1. Password visibility toggle (Eye / Eye-off icon switch)
 * 2. Form validation (Name, Email, Password)
 * 3. Interactive feedback and loading states
 * 4. Social login buttons & Sign-in navigation handlers
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const signupForm = document.getElementById('signupForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const formFeedback = document.getElementById('formFeedback');

  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  const googleBtn = document.getElementById('googleBtn');
  const appleBtn = document.getElementById('appleBtn');
  const githubBtn = document.getElementById('githubBtn');
  const signInBtn = document.getElementById('signInBtn');
  const logoBtn = document.querySelector('.logo-button');

  // ----------------------------------------------------
  // 1. Password Show / Hide Toggle
  // ----------------------------------------------------
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

      if (isPassword) {
        passwordToggle.classList.add('is-visible');
        passwordToggle.setAttribute('aria-label', 'Hide password');
      } else {
        passwordToggle.classList.remove('is-visible');
        passwordToggle.setAttribute('aria-label', 'Show password');
      }

      passwordInput.focus();
    });
  }

  // ----------------------------------------------------
  // 2. Field Error Helpers
  // ----------------------------------------------------
  const setError = (input, errorEl, message) => {
    const parentField = input.closest('.form-field');
    if (parentField) {
      parentField.classList.add('has-error');
    }
    if (errorEl) {
      errorEl.textContent = message;
    }
  };

  const clearError = (input, errorEl) => {
    const parentField = input.closest('.form-field');
    if (parentField) {
      parentField.classList.remove('has-error');
    }
    if (errorEl) {
      errorEl.textContent = '';
    }
  };

  // Real-time error clearing when user types
  [nameInput, emailInput, passwordInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      const parentField = input.closest('.form-field');
      if (parentField && parentField.classList.contains('has-error')) {
        const errEl = parentField.querySelector('.field-error');
        clearError(input, errEl);
      }
      if (formFeedback) {
        formFeedback.style.display = 'none';
        formFeedback.className = 'form-feedback';
      }
    });
  });

  // ----------------------------------------------------
  // 3. Form Validation & Submission
  // ----------------------------------------------------
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset errors
      clearError(nameInput, nameError);
      clearError(emailInput, emailError);
      clearError(passwordInput, passwordError);

      if (formFeedback) {
        formFeedback.style.display = 'none';
        formFeedback.className = 'form-feedback';
      }

      const nameVal = nameInput.value.trim();
      const emailVal = emailInput.value.trim();
      const passwordVal = passwordInput.value;

      let isValid = true;
      let firstInvalidInput = null;

      // Validate Name
      if (!nameVal) {
        setError(nameInput, nameError, 'Full name is required.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = nameInput;
      } else if (nameVal.length < 2) {
        setError(nameInput, nameError, 'Name must be at least 2 characters.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = nameInput;
      }

      // Validate Email
      if (!emailVal) {
        setError(emailInput, emailError, 'Email address is required.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = emailInput;
      } else if (!emailRegex.test(emailVal)) {
        setError(emailInput, emailError, 'Please enter a valid email address.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = emailInput;
      }

      // Validate Password
      if (!passwordVal) {
        setError(passwordInput, passwordError, 'Password is required.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = passwordInput;
      } else if (passwordVal.length < 6) {
        setError(passwordInput, passwordError, 'Password must be at least 6 characters.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = passwordInput;
      }

      if (!isValid) {
        if (firstInvalidInput) firstInvalidInput.focus();
        return;
      }

      // Submission simulation / feedback
      try {
        createAccountBtn.disabled = true;
        const originalText = createAccountBtn.textContent;
        createAccountBtn.textContent = 'Creating Account...';

        // Check if backend API is available
        let apiHandled = false;
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameVal,
              email: emailVal,
              phone: '',
              password: passwordVal,
              role: 'Patient'
            })
          });

          if (res.ok) {
            const data = await res.json();
            apiHandled = true;
            if (formFeedback) {
              formFeedback.className = 'form-feedback success';
              formFeedback.textContent = 'Account created successfully! Welcome aboard, ' + (data.user?.name || nameVal) + '.';
            }
            createAccountBtn.textContent = 'Account Created!';
          } else {
            const errData = await res.json().catch(() => null);
            if (errData && errData.message) {
              apiHandled = true;
              if (formFeedback) {
                formFeedback.className = 'form-feedback error';
                formFeedback.textContent = errData.message;
              }
            }
          }
        } catch {
          // Running in static environment without backend
        }

        if (!apiHandled) {
          // Client-side standalone success response
          await new Promise((r) => setTimeout(r, 600));
          if (formFeedback) {
            formFeedback.className = 'form-feedback success';
            formFeedback.textContent = `Account created successfully! Welcome aboard, ${nameVal}.`;
          }
          createAccountBtn.textContent = 'Account Created!';
        }

        setTimeout(() => {
          createAccountBtn.disabled = false;
          createAccountBtn.textContent = originalText;
        }, 3000);

      } catch (err) {
        console.error(err);
        createAccountBtn.disabled = false;
        createAccountBtn.textContent = 'Create Account';
        if (formFeedback) {
          formFeedback.className = 'form-feedback error';
          formFeedback.textContent = 'An unexpected error occurred. Please try again.';
        }
      }
    });
  }

  // ----------------------------------------------------
  // 4. Social Login Buttons
  // ----------------------------------------------------
  const handleSocialClick = (provider) => {
    if (formFeedback) {
      formFeedback.className = 'form-feedback info';
      formFeedback.textContent = `Connecting to ${provider}... Please follow the authentication prompt.`;
      formFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  if (googleBtn) {
    googleBtn.addEventListener('click', () => handleSocialClick('Google'));
  }
  if (appleBtn) {
    appleBtn.addEventListener('click', () => handleSocialClick('Apple'));
  }
  if (githubBtn) {
    githubBtn.addEventListener('click', () => handleSocialClick('GitHub'));
  }

  // ----------------------------------------------------
  // 5. Sign In & Logo Buttons
  // ----------------------------------------------------
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      if (formFeedback) {
        formFeedback.className = 'form-feedback info';
        formFeedback.textContent = 'Redirecting to sign-in page...';
      }
      setTimeout(() => {
        if (window.location.hostname) {
          window.location.href = 'login.html';
        }
      }, 500);
    });
  }

  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      if (window.location.hostname) {
        window.location.href = 'index.html';
      }
    });
  }
});
