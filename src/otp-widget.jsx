import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import CodeSlots from './components/CodeSlots';
import './components/CodeSlots.css';

function InlineOtpReset({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess
}) {
  const [step, setStep] = useState(1); // 1: Message + CodeSlots, 2: New Password, 3: Success
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | error | success
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Sync initial email when opened
  useEffect(() => {
    if (isOpen) {
      const loginEmailVal = document.getElementById('loginEmail')?.value?.trim();
      const targetEmail = initialEmail || loginEmailVal || '';
      setEmail(targetEmail);
      setStatus('idle');
      setCode('');
      setErrorMsg('');
      setStep(1);

      if (targetEmail && targetEmail.includes('@')) {
        sendOtpRequest(targetEmail);
      }
    }
  }, [isOpen, initialEmail]);

  // Resend countdown timer
  useEffect(() => {
    let interval;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(t => {
          if (t <= 1) {
            setCanResend(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  if (!isOpen) return null;

  // Send OTP to Gmail
  const sendOtpRequest = async (targetEmail) => {
    const cleanEmail = (targetEmail || email).trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to send OTP code.');
        return;
      }

      setOtpSent(true);
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      setLoading(false);
      setErrorMsg('Network error. Please try again.');
    }
  };

  // Verify OTP via CodeSlots
  const handleVerifyOtp = async (otpCode) => {
    const toVerify = String(otpCode || code).trim();
    if (toVerify.length < 6) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: toVerify })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.message || 'Incorrect verification code. Please check your Gmail.');
        return;
      }

      setStatus('success');
      setTimeout(() => {
        setStep(2);
        setErrorMsg('');
      }, 700);
    } catch (err) {
      setLoading(false);
      setStatus('error');
      setErrorMsg('Unable to verify OTP. Please try again.');
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: code,
          newPassword
        })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to reset password.');
        return;
      }

      // Update password field on login form
      const loginEmailInput = document.getElementById('loginEmail');
      const loginPwInput = document.getElementById('loginPassword');
      if (loginEmailInput) loginEmailInput.value = email.trim();
      if (loginPwInput) loginPwInput.value = newPassword;

      setStep(3);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(newPassword);
        }, 1200);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Network error while resetting password.');
    }
  };

  // STEP 1: Message + 6 CodeSlots directly below password
  if (step === 1) {
    return (
      <div className="inline-otp-container-inner text-center w-100">
        {/* Sent Message Banner */}
        <div className="inline-otp-msg-badge mb-2">
          <i className="bi bi-envelope-check-fill text-primary me-1"></i>
          <span>Verification code sent to <strong>{email}</strong></span>
        </div>

        {/* Error message if incorrect code */}
        {errorMsg && (
          <div className="inline-otp-err-badge mb-2 d-block">
            <i className="bi bi-exclamation-circle-fill text-danger me-1"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* The 6 CodeSlots */}
        <div className="only-slots-wrap py-1">
          <CodeSlots
            length={6}
            value={code}
            status={status}
            onChange={val => {
              setCode(val);
              if (val && val.length > 0) {
                if (status === 'error') setStatus('idle');
                if (errorMsg) setErrorMsg('');
              }
            }}
            onComplete={handleVerifyOtp}
            accentColor="#2563eb"
            inkColor="#2563eb"
            slotColor="#ffffff"
            digitColor="#0f172a"
            dangerColor="#ef4444"
            slotSize={44}
            gap={10}
            radius={14}
            bounce={0.2}
            settle={0.3}
            rise={8}
            cascade={20}
            autoFocus={true}
          />
        </div>

        {/* Resend text & countdown */}
        <div className="inline-otp-resend-row mt-2">
          {canResend ? (
            <button
              type="button"
              className="inline-resend-link-btn"
              onClick={() => sendOtpRequest(email)}
              disabled={loading}
            >
              Resend Code
            </button>
          ) : (
            <span className="small text-muted">
              Resend in <strong>{resendTimer}s</strong>
            </span>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: Minimal New Password input after OTP verified
  if (step === 2) {
    return (
      <form onSubmit={handleResetPassword} className="new-pw-mini-wrap my-2 w-100">
        <div className="small text-muted mb-2 text-center">
          Code verified! Set new password for <strong>{email}</strong>
        </div>

        {errorMsg && (
          <div className="inline-otp-err-badge mb-2 d-block text-center">
            <i className="bi bi-exclamation-circle-fill text-danger me-1"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="medical-input-box mb-2">
          <span className="medical-input-icon"><i className="bi bi-lock"></i></span>
          <input
            type="password"
            className="medical-input-control"
            placeholder="New Password (min 6 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="medical-input-box mb-2">
          <span className="medical-input-icon"><i className="bi bi-shield-check"></i></span>
          <input
            type="password"
            className="medical-input-control"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-submit-btn w-100" disabled={loading}>
          {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
        </button>
      </form>
    );
  }

  // STEP 3: Brief success confirmation
  if (step === 3) {
    return (
      <div className="text-center py-2 text-success fw-bold">
        <i className="bi bi-check-circle-fill me-1"></i> Password updated! Signing in...
      </div>
    );
  }

  return null;
}

// Dedicated Register OTP Verification Component
function RegisterOtpVerify({
  email,
  onVerify,
  onResend,
  onCancel,
  onSuccess
}) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleComplete = async (enteredCode) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (onVerify) {
        const res = await onVerify(enteredCode);
        if (res && res.success) {
          setStatus('success');
          setTimeout(() => {
            if (onSuccess) onSuccess(res);
          }, 800);
        } else {
          setStatus('error');
          setErrorMsg((res && res.message) || 'Invalid verification code. Please check your Gmail.');
        }
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Verification failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (onResend) {
        await onResend();
      }
      setResendTimer(60);
      setCanResend(false);
      setCode('');
      setStatus('idle');
    } catch (err) {
      setErrorMsg('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-otp-container-inner text-center w-100">
      {/* Sent Message Banner */}
      <div className="inline-otp-msg-badge mb-2">
        <i className="bi bi-envelope-check-fill text-primary me-1"></i>
        <span>Verification code sent to <strong>{email}</strong></span>
      </div>

      {/* Error message if incorrect code */}
      {errorMsg && (
        <div className="inline-otp-err-badge mb-2 d-block">
          <i className="bi bi-exclamation-circle-fill text-danger me-1"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="small text-primary mb-1 fw-semibold">
          <span className="spinner-border spinner-border-sm me-1"></span> Verifying code...
        </div>
      )}

      {/* The 6 CodeSlots */}
      <div className="only-slots-wrap py-1">
        <CodeSlots
          length={6}
          value={code}
          status={status}
          onChange={val => {
            setCode(val);
            if (val && val.length > 0) {
              if (status === 'error') setStatus('idle');
              if (errorMsg) setErrorMsg('');
            }
          }}
          onComplete={handleComplete}
          accentColor="#2563eb"
          inkColor="#2563eb"
          slotColor="#ffffff"
          digitColor="#0f172a"
          dangerColor="#ef4444"
          slotSize={44}
          gap={10}
          radius={14}
          bounce={0.2}
          settle={0.3}
          rise={8}
          cascade={20}
          autoFocus={true}
        />
      </div>

      {/* Resend & Edit Details Row */}
      <div className="inline-otp-resend-row mt-2 d-flex align-items-center justify-content-between px-2">
        {onCancel && (
          <button
            type="button"
            className="inline-resend-link-btn text-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            &larr; Edit Details
          </button>
        )}
        <div className="ms-auto">
          {canResend ? (
            <button
              type="button"
              className="inline-resend-link-btn"
              onClick={handleResend}
              disabled={loading}
            >
              Resend Code
            </button>
          ) : (
            <span className="small text-muted">
              Resend in <strong>{resendTimer}s</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Global Mount Controller for Login Inline Reset
let inlineRoot = null;

function getInlineContainer() {
  let el = document.getElementById('inlineOtpSection');
  if (!el) {
    el = document.getElementById('inlineOtpContainer');
  }
  return el;
}

function renderInlineOtp(isOpen, initialEmail = '') {
  const container = getInlineContainer();
  if (!container) return;

  if (!isOpen) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  if (!inlineRoot) {
    inlineRoot = ReactDOM.createRoot(container);
  }

  inlineRoot.render(
    <InlineOtpReset
      isOpen={true}
      initialEmail={initialEmail}
      onClose={() => renderInlineOtp(false)}
      onSuccess={(newPw) => {
        const pwInput = document.getElementById('loginPassword');
        if (pwInput && newPw) pwInput.value = newPw;
        renderInlineOtp(false);
      }}
    />
  );
}

// Global Mount Controller for Register OTP Verification
let registerRoot = null;

function renderRegisterOtp(container, props) {
  if (!container) return;
  if (!props) {
    container.style.display = 'none';
    if (registerRoot) {
      registerRoot.unmount();
      registerRoot = null;
    }
    return;
  }
  container.style.display = 'flex';
  if (!registerRoot) {
    registerRoot = ReactDOM.createRoot(container);
  }
  registerRoot.render(<RegisterOtpVerify {...props} />);
}

const CodeSlotsOtp = {
  open: (email) => {
    const loginEmailInput = document.getElementById('loginEmail');
    const targetEmail = (email || loginEmailInput?.value || '').trim();
    renderInlineOtp(true, targetEmail);
  },
  close: () => renderInlineOtp(false),
  toggle: (email) => {
    const container = getInlineContainer();
    const isCurrentlyOpen = container && container.style.display !== 'none';
    if (isCurrentlyOpen) {
      renderInlineOtp(false);
    } else {
      const loginEmailInput = document.getElementById('loginEmail');
      const targetEmail = (email || loginEmailInput?.value || '').trim();
      renderInlineOtp(true, targetEmail);
    }
  },
  mountRegisterOtp: renderRegisterOtp,
  mount: (targetEl, props = {}) => {
    const root = ReactDOM.createRoot(targetEl);
    root.render(<CodeSlots {...props} />);
    return root;
  },
  CodeSlots,
  InlineOtpReset,
  RegisterOtpVerify
};

if (typeof window !== 'undefined') {
  window.CodeSlotsOtp = CodeSlotsOtp;
}

export default CodeSlotsOtp;
