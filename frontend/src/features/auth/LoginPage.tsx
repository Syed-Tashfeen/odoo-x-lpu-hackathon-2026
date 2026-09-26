import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import { authService, loginZodSchema } from '../../lib/authService';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const trimmedLoginId = loginId.trim();

    // 1. Zod client-side validation
    const validationResult = loginZodSchema.safeParse({ loginId: trimmedLoginId, password });
    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      }
      setFieldErrors(formattedErrors);
      return;
    }

    setIsLoading(true);
    try {
      // 2. Authenticate against database
      const result = await authService.login(trimmedLoginId, password);
      setAuth(result.user, result.token);
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      // Per wireframe specification: "Invalid Login Id or Password"
      const message = err.message || 'Invalid Login Id or Password';
      setErrorMessage(message);
      toast.error(message);
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
          <h2 className={styles.formTitle}>Sign In</h2>
        </div>

        {/* Error message banner */}
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Login Id"
            type="text"
            placeholder="Enter Login Id or Email"
            value={loginId}
            onChange={(e) => {
              setLoginId(e.target.value);
              if (fieldErrors.loginId) {
                setFieldErrors((prev) => ({ ...prev, loginId: '' }));
              }
              if (errorMessage) setErrorMessage(null);
            }}
            error={fieldErrors.loginId}
            autoComplete="username"
            autoFocus
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: '' }));
              }
              if (errorMessage) setErrorMessage(null);
            }}
            error={fieldErrors.password}
            autoComplete="current-password"
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

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'SIGN IN'}
          </button>
        </form>

        {/* Wireframe links: "Forgot Password ? | Sign Up" */}
        <div className={styles.authLinksRow}>
          <Link to="/forgot-password" className={styles.authLink}>
            Forgot Password ?
          </Link>
          <span className={styles.divider}>|</span>
          <Link to="/register" className={styles.authLink}>
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}
