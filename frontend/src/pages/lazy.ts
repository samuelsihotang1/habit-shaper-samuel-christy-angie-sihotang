import { lazy } from 'react';

/*
 * Every page but Login is its own chunk, fetched the first time it
 * is shown. Hovering or focusing a link to one calls the same loader, so the
 * chunk is usually there before the click; the browser fetches a module once.
 */
export const loaders = {
  signUp: () => import('@/pages/SignUpPage'),
  forgotPassword: () => import('@/pages/ForgotPasswordPage'),
  settings: () => import('@/pages/settings/SettingsPage'),
  password: () => import('@/pages/settings/PasswordPage'),
  security: () => import('@/pages/settings/SecurityPage'),
};

export const SignUpPage = lazy(() => loaders.signUp().then((module) => ({ default: module.SignUpPage })));
export const ForgotPasswordPage = lazy(() => loaders.forgotPassword().then((module) => ({ default: module.ForgotPasswordPage })));
export const SettingsPage = lazy(() => loaders.settings().then((module) => ({ default: module.SettingsPage })));
export const PasswordPage = lazy(() => loaders.password().then((module) => ({ default: module.PasswordPage })));
export const SecurityPage = lazy(() => loaders.security().then((module) => ({ default: module.SecurityPage })));

/** The loader behind a link target, for the links that preload. */
const byPath: Record<string, keyof typeof loaders> = {
  '/settings': 'settings',
  '/settings/password': 'password',
  '/settings/security': 'security',
};

export function preload(path: string): void {
  const name = byPath[path];
  if (name) void loaders[name]();
}
