import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { authService, forgotPasswordZodSchema } from '../../lib/authService';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordZodSchema.safeParse({ identifier });
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Please enter your Login Id or Email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.requestPasswordReset(identifier);
      setGeneratedOtp(response.otp || null);
      setSuccessMessage(response.message || 'If an account with that email exists, an OTP has been sent.');
      setIsSubmitted(true);
      toast.success('Verification request processed!');
    } catch (err: any) {
      const msg = err.message || 'Failed to process request';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToReset = () => {
    navigate(`/reset-password?identifier=${encodeURIComponent(identifier)}&otp=${generatedOtp || ''}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* App Logo */}
        <div className={styles.logoWrapper}>
          <div className={styles.logoBadge}>S</div>
          <h1 className={styles.brandName}>StockSense</h1>
          <p className={styles.brandTagline}>Inventory Management System</p>
          <h2 className={styles.formTitle}>Forgot Password</h2>
          <p className={styles.instructions}>
            Enter your Login Id or registered Email to receive a 6-digit verification code.
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className={styles.successBox}>
            {generatedOtp ? (
              <>
                <p><strong>Verification Code Generated:</strong></p>
                <div className={styles.otpDisplay}>{generatedOtp}</div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  This code has also been sent to your email and expires in 10 minutes.
                </p>
              </>
            ) : (
              <>
                <p><strong>Check Your Email:</strong></p>
                <p style={{ fontSize: '14px', color: '#334155', margin: '12px 0' }}>
                  {successMessage}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Please check your inbox (and spam folder) for the 6-digit verification code.
                </p>
              </>
            )}
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleProceedToReset}
              style={{ marginTop: '16px' }}
            >
              Continue to Reset Password →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input
              label="Login Id or Email Id"
              type="text"
              placeholder="e.g. admin or admin@stocksense.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? 'Sending Code...' : 'SEND VERIFICATION CODE'}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          Remember your password?
          <Link to="/login" className={styles.link}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
