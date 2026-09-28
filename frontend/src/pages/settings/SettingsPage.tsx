import { Link } from 'react-router';
import { Icon, type IconName } from '@/components/icons';
import { Button, cx } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { preload } from '@/pages/lazy';

const ROWS: { to: string; label: string; hint: string; icon: IconName; tone: string }[] = [
  { to: '/habits', label: 'Manage habits', hint: 'Edit or delete a habit', icon: 'list', tone: 'bg-accent-orange' },
  { to: '/settings/password', label: 'Password', hint: 'Change your password', icon: 'lock', tone: 'bg-accent-purple' },
  { to: '/settings/security', label: 'Two-factor and browsers', hint: 'Authenticator app, trusted browsers', icon: 'shield', tone: 'bg-accent-green' },
];

const SPACES = /\s+/;

const initials = (name: string) =>
  name
    .split(SPACES)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

/** The reference's Setting screen: profile, a dark call-out, a list of rows, sign out. */
export function SettingsPage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-5">
      <h1 className="text-heading font-bold text-ink">Settings</h1>

      <section className="flex items-center gap-4 rounded-3xl bg-surface p-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-ink">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-ink">{user.name}</p>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
        </div>
      </section>

      <Link
        to="/settings/security"
        onMouseEnter={() => preload('/settings/security')}
        onFocus={() => preload('/settings/security')}
        className="flex items-center justify-between gap-4 rounded-3xl bg-night p-5 text-white">
        <div>
          <p className="font-bold">Two-factor authentication is {user.mfa_enabled ? 'on' : 'off'}</p>
          <p className="mt-1 text-sm text-white/70">
            {user.mfa_enabled ? 'Sign-in asks for a code from your app.' : 'Turn it on to protect your account and to reset a forgotten password.'}
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
          <Icon name="shield" className="size-5" />
        </span>
      </Link>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Application</h2>
        <ul className="space-y-2 rounded-3xl bg-surface p-3">
          {ROWS.map((row) => (
            <li key={row.to}>
              <Link
                to={row.to}
                onMouseEnter={() => preload(row.to)}
                onFocus={() => preload(row.to)}
                className="flex items-center gap-3 rounded-full bg-canvas p-2 pr-4 hover:bg-line/60">
                <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full text-white', row.tone)}>
                  <Icon name={row.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{row.label}</span>
                  <span className="block truncate text-xs text-ink-muted">{row.hint}</span>
                </span>
                <Icon name="chevron-right" className="size-4 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Button className="w-full" onClick={() => void logout()}>
        <Icon name="logout" className="size-5" />
        Sign out
      </Button>
    </div>
  );
}
