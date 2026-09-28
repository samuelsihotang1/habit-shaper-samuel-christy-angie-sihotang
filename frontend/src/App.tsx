import { Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards';
import { AppShell } from '@/components/Shells';
import { ForgotPasswordPage, PasswordPage, SecurityPage, SettingsPage, SignUpPage } from '@/pages/lazy';
import { LoginPage } from '@/pages/LoginPage';

// Login stays in the main bundle: it is the first screen of every signed-out visit.
export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/password" element={<PasswordPage />} />
          <Route path="/settings/security" element={<SecurityPage />} />
        </Route>
        <Route path="/account" element={<Navigate to="/settings" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}
