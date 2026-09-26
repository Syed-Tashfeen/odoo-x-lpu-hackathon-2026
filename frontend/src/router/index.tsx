import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { ProtectedRoute, PublicOnlyRoute } from './guards';

/* ---- Lazy Loaded Pages ---- */
const LandingPage        = lazy(() => import('../features/landing/LandingPage'));
const LoginPage          = lazy(() => import('../features/auth/LoginPage'));
const RegisterPage       = lazy(() => import('../features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('../features/auth/ResetPasswordPage'));

const DashboardPage   = lazy(() => import('../features/dashboard/DashboardPage'));
const ProductsPage    = lazy(() => import('../features/products/ProductsPage'));
const OperationsPage  = lazy(() => import('../features/operations/OperationsPage'));
const MoveHistoryPage = lazy(() => import('../features/move-history/MoveHistoryPage'));
const SettingsPage    = lazy(() => import('../features/settings/SettingsPage'));

/* ---- Fallback Spinner ---- */
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--color-bg, #F8FAFC)' }}>
    <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#714B67', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* ---- Router Config ---- */
const router = createBrowserRouter([
  /* Public Landing Page */
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>,
  },

  /* Auth Pages (Redirect to /dashboard if already logged in) */
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>,
      },
      {
        path: '/register',
        element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>,
      },
      {
        path: '/forgot-password',
        element: <Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>,
      },
      {
        path: '/reset-password',
        element: <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>,
      },
      {
        path: '/auth/login',
        element: <Navigate to="/login" replace />,
      },
      {
        path: '/auth/register',
        element: <Navigate to="/register" replace />,
      },
    ],
  },

  /* Protected Application Shell */
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/dashboard',
            element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
          },
          {
            path: '/products',
            element: <Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>,
          },
          {
            path: '/operations',
            element: <Navigate to="/operations/receipts" replace />,
          },
          {
            path: '/operations/receipts',
            element: <Suspense fallback={<PageLoader />}><OperationsPage /></Suspense>,
          },
          {
            path: '/operations/deliveries',
            element: <Suspense fallback={<PageLoader />}><OperationsPage /></Suspense>,
          },
          {
            path: '/operations/transfers',
            element: <Suspense fallback={<PageLoader />}><OperationsPage /></Suspense>,
          },
          {
            path: '/operations/adjustments',
            element: <Suspense fallback={<PageLoader />}><OperationsPage /></Suspense>,
          },
          {
            path: '/move-history',
            element: <Suspense fallback={<PageLoader />}><MoveHistoryPage /></Suspense>,
          },
          {
            path: '/settings',
            element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
          },
        ],
      },
    ],
  },

  /* 404 Fallback */
  {
    path: '*',
    element: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, fontFamily: 'Inter, sans-serif', backgroundColor: '#F8FAFC' }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: '#714B67' }}>404</div>
        <div style={{ fontSize: 18, color: '#64748B' }}>Page not found</div>
        <a href="/dashboard" style={{ color: '#714B67', fontWeight: 600 }}>← Back to Dashboard</a>
      </div>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
