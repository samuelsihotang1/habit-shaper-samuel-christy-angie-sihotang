import { Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards';
import { AppShell, TabShell } from '@/components/Shells';
import {
  ForgotPasswordPage,
  GoalFormPage,
  GoalsPage,
  HabitDetailPage,
  HabitFormPage,
  HabitsPage,
  PasswordPage,
  SecurityPage,
  SettingsPage,
  SignUpPage,
} from '@/pages/lazy';
import { LoginPage } from '@/pages/LoginPage';
import { TodayPage } from '@/pages/today/TodayPage';

// Login and Today stay in the main bundle: one of them is the first screen of every visit.
export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<TabShell />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/new" element={<HabitFormPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
          <Route path="/habits/:id/edit" element={<HabitFormPage />} />
          <Route path="/goals/new" element={<GoalFormPage />} />
          <Route path="/goals/:id/edit" element={<GoalFormPage />} />
          <Route path="/settings/password" element={<PasswordPage />} />
          <Route path="/settings/security" element={<SecurityPage />} />
        </Route>
        <Route path="/account" element={<Navigate to="/settings" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
