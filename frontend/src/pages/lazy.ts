import { lazy } from 'react';

/*
 * Every page but Login and Today is its own chunk, fetched the first time it
 * is shown. Hovering or focusing a link to one calls the same loader, so the
 * chunk is usually there before the click; the browser fetches a module once.
 */
export const loaders = {
  signUp: () => import('@/pages/SignUpPage'),
  forgotPassword: () => import('@/pages/ForgotPasswordPage'),
  goals: () => import('@/pages/goals/GoalsPage'),
  goalForm: () => import('@/pages/goals/GoalFormPage'),
  settings: () => import('@/pages/settings/SettingsPage'),
  password: () => import('@/pages/settings/PasswordPage'),
  security: () => import('@/pages/settings/SecurityPage'),
  habits: () => import('@/pages/habits/HabitsPage'),
  habitForm: () => import('@/pages/habits/HabitFormPage'),
  habitDetail: () => import('@/pages/habits/HabitDetailPage'),
};

export const SignUpPage = lazy(() => loaders.signUp().then((module) => ({ default: module.SignUpPage })));
export const ForgotPasswordPage = lazy(() => loaders.forgotPassword().then((module) => ({ default: module.ForgotPasswordPage })));
export const GoalsPage = lazy(() => loaders.goals().then((module) => ({ default: module.GoalsPage })));
export const GoalFormPage = lazy(() => loaders.goalForm().then((module) => ({ default: module.GoalFormPage })));
export const SettingsPage = lazy(() => loaders.settings().then((module) => ({ default: module.SettingsPage })));
export const PasswordPage = lazy(() => loaders.password().then((module) => ({ default: module.PasswordPage })));
export const SecurityPage = lazy(() => loaders.security().then((module) => ({ default: module.SecurityPage })));
export const HabitsPage = lazy(() => loaders.habits().then((module) => ({ default: module.HabitsPage })));
export const HabitFormPage = lazy(() => loaders.habitForm().then((module) => ({ default: module.HabitFormPage })));
export const HabitDetailPage = lazy(() => loaders.habitDetail().then((module) => ({ default: module.HabitDetailPage })));

/** The loader behind a link target, for the links that preload. */
const byPath: Record<string, keyof typeof loaders> = {
  '/goals': 'goals',
  '/settings': 'settings',
  '/settings/password': 'password',
  '/settings/security': 'security',
  '/habits': 'habits',
};

export function preload(path: string): void {
  const name = byPath[path];
  if (name) void loaders[name]();
}
