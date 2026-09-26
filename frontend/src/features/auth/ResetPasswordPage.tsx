import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { authService, resetPasswordZodSchema } from '../../lib/authService';
import styles from './ResetPasswordPage.module.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState(searchParams.get('identifier') || '');
  const [otp, setOtp] = useState(searchParams.get('otp') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Live password validation checklist
  const hasMinLength = newPassword.length > 8;
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const result = resetPasswordZodSchema.safeParse({
      identifier,
      otp,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const errMap: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!errMap[field]) {
          errMap[field] = issue.message;
        }
      }
      setFieldErrors(errMap);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        identifier,
        otp,
        newPassword,
        confirmPassword,
      });

      toast.success('Password updated successfully! Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* App Logo */}
        <div className={styles.logoWrapper}>
          <div className={styles.logoBadge}>S</div>
          <h1 className={styles.brandName}>StockSense</h1>
          <p className={styles.brandTagline}>Inventory Management System</p>
          <h2 className={styles.formTitle}>Reset Password</h2>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Login Id or Email Id"
            type="text"
            placeholder="e.g. admin or user@stocksense.com"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: '' }));
              if (errorMessage) setErrorMessage(null);
            }}
            error={fieldErrors.identifier}
          />

          <Input
            label="6-Digit Verification Code"
            type="text"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''));
              if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: '' }));
              if (errorMessage) setErrorMessage(null);
            }}
            error={fieldErrors.otp}
            helperText="Enter the 6-digit OTP code received"
          />

          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
              if (errorMessage) setErrorMessage(null);
            }}
            error={fieldErrors.newPassword}
            rightIcon={
              <button
                type="button"
                className={styles.togglePassBtn}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />

          {newPassword.length > 0 && (
            <div className={styles.rulesBox}>
              <span className={styles.rulesTitle}>Password Criteria:</span>
              <span className={`${styles.ruleItem} ${hasMinLength ? styles.valid : ''}`}>
                {hasMinLength ? '✓' : '○'} More than 8 characters ({newPassword.length}/9+)
              </span>
              <span className={`${styles.ruleItem} ${hasLowerCase ? styles.valid : ''}`}>
                {hasLowerCase ? '✓' : '○'} At least one lowercase letter
              </span>
              <span className={`${styles.ruleItem} ${hasUpperCase ? styles.valid : ''}`}>
                {hasUpperCase ? '✓' : '○'} At least one uppercase letter
              </span>
              <span className={`${styles.ruleItem} ${hasSpecialChar ? styles.valid : ''}`}>
                {hasSpecialChar ? '✓' : '○'} At least one special character
              </span>
            </div>
          )}

          <Input
            label="Re-Enter New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
              if (errorMessage) setErrorMessage(null);
            }}
            error={fieldErrors.confirmPassword}
            rightIcon={
              <button
                type="button"
                className={styles.togglePassBtn}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Updating Password...' : 'RESET PASSWORD'}
          </button>
        </form>

        <div className={styles.footer}>
          Return to
          <Link to="/login" className={styles.link}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
