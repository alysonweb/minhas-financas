import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Accounts     = lazy(() => import('./pages/Accounts'));
const CreditCards  = lazy(() => import('./pages/CreditCards'));
const Categories   = lazy(() => import('./pages/Categories'));
const Goals        = lazy(() => import('./pages/Goals'));
const Reports      = lazy(() => import('./pages/Reports'));
const Budget       = lazy(() => import('./pages/Budget'));
const Templates    = lazy(() => import('./pages/Templates'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '10px', fontFamily: 'inherit', fontSize: '14px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="transactions" element={<Suspense fallback={<PageLoader />}><Transactions /></Suspense>} />
              <Route path="accounts" element={<Suspense fallback={<PageLoader />}><Accounts /></Suspense>} />
              <Route path="credit-cards" element={<Suspense fallback={<PageLoader />}><CreditCards /></Suspense>} />
              <Route path="categories" element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
              <Route path="goals" element={<Suspense fallback={<PageLoader />}><Goals /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
              <Route path="budget" element={<Suspense fallback={<PageLoader />}><Budget /></Suspense>} />
              <Route path="templates" element={<Suspense fallback={<PageLoader />}><Templates /></Suspense>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
