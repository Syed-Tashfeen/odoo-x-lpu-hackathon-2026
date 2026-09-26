import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { AppRouter } from './router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './styles/design-system.css';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#fff' },
            style: { borderLeft: '4px solid #059669' },
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: '#fff' },
            style: { borderLeft: '4px solid #DC2626' },
          },
        }}
      />
    </QueryClientProvider>
  );
}
