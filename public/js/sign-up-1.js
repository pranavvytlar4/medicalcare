/**
 * ============================================================================
 * Sign Up 1 Public Script
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
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

  // 1. Password Show / Hide Toggle
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

  // 2. Field Error Helpers
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

  // 3. Form Validation & Submission
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

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

      if (!nameVal) {
        setError(nameInput, nameError, 'Full name is required.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = nameInput;
      } else if (nameVal.length < 2) {
        setError(nameInput, nameError, 'Name must be at least 2 characters.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = nameInput;
      }

      if (!emailVal) {
        setError(emailInput, emailError, 'Email address is required.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = emailInput;
      } else if (!emailRegex.test(emailVal)) {
        setError(emailInput, emailError, 'Please enter a valid email address.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = emailInput;
      }

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

      try {
        createAccountBtn.disabled = true;
        const originalText = createAccountBtn.textContent;
        createAccountBtn.textContent = 'Creating Account...';

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

        const data = await res.json();
        createAccountBtn.disabled = false;
        createAccountBtn.textContent = originalText;

        if (res.ok) {
          if (formFeedback) {
            formFeedback.className = 'form-feedback success';
            formFeedback.textContent = 'Account created successfully! Redirecting...';
          }
          if (window.Auth && window.Auth.login) {
            window.Auth.login(data.token, data.user);
          }
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          if (formFeedback) {
            formFeedback.className = 'form-feedback error';
            formFeedback.textContent = data.message || 'Registration failed.';
          }
        }
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

  // 4. Social Buttons
  const handleSocialClick = (provider) => {
    if (formFeedback) {
      formFeedback.className = 'form-feedback info';
      formFeedback.textContent = `Connecting to ${provider}... Please follow the authentication prompt.`;
    }
  };

  if (googleBtn) googleBtn.addEventListener('click', () => handleSocialClick('Google'));
  if (appleBtn) appleBtn.addEventListener('click', () => handleSocialClick('Apple'));
  if (githubBtn) githubBtn.addEventListener('click', () => handleSocialClick('GitHub'));

  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }

  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
});
