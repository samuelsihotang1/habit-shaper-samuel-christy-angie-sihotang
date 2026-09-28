import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

/*
 * Both guards read the session the cookie holds. That is a UX hint only: the
 * API's `authenticate` hook is the gate, and a dead token comes back as a 401
 * that signs the browser out (useAuth).
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

/**
 * Also where a completed sign-in lands: the moment useAuth holds a user, this
 * sends the page back to where ProtectedRoute bounced it from, or home.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  if (isAuthenticated) return <Navigate to={from ?? '/'} replace />;
  // Sign-up and password reset load as chunks of their own; for that moment, nothing.
  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  );
}
