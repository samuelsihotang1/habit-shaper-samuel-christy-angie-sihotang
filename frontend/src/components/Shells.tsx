import { Suspense, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Icon, type IconName } from '@/components/icons';
import { cx } from '@/components/ui';
import { preload } from '@/pages/lazy';

/** The H mark on its yellow tile, as in the reference's app icon. Same drawing as public/favicon.svg. */
export function LogoMark({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-brand" />
      <path fill="#fff" d="M18 16h9v13h10a9 9 0 0 1 9 9v10h-9V39a3 3 0 0 0-3-3h-7v12h-9z" />
      <path fill="#fff" d="M37 16h9v18h-9z" />
    </svg>
  );
}

/** Ink on white: yellow text there is 2.1:1. The lockup is `docs/brand/logo/horizontal.svg`. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 text-lg text-ink">
      <LogoMark />
      <span className="font-semibold">
        Habit <span className="font-extrabold">Shaper</span>
      </span>
    </span>
  );
}

/**
 * The phone-width column every screen lives in, on every screen size: the
 * reference is a mobile app, and a wider layout would be a different design.
 */
function Column({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto min-h-screen w-full max-w-[480px] px-5', className)}>{children}</div>;
}

/** The signed-out pages, drawn like the reference's Welcome screen. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <Column className="flex flex-col pt-10 pb-10">
      <Link to="/login" className="self-start">
        <Logo />
      </Link>
      <div className="mt-10 rounded-[2rem] bg-night px-6 pt-8 pb-10 text-white">
        <p className="text-sm font-semibold text-brand">Track habits. Stay consistent.</p>
        <p className="mt-2 text-heading font-bold">Build the good ones. Break the rest.</p>
      </div>
      <main className="-mt-6 rounded-[2rem] bg-surface px-6 py-8">
        <h1 className="text-title font-bold text-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-ink-muted">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </main>
    </Column>
  );
}

/**
 * What shows while a page's chunk loads (pages/lazy.ts). The Suspense sits
 * inside each shell, so the tab bar stays on screen rather than blanking with the page.
 */
const PAGE_LOADING = <div className="h-72 animate-pulse rounded-3xl bg-surface" aria-busy="true" aria-label="Loading" />;

/** Signed-in screens without the tab bar: forms and details, which have a back arrow instead. */
export function AppShell() {
  return (
    <Column className="pt-6 pb-10">
      <Suspense fallback={PAGE_LOADING}>
        <Outlet />
      </Suspense>
    </Column>
  );
}

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'calendar' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/stats', label: 'Statistics', icon: 'sparkles' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

/** The four top-level screens, over the reference's black tab bar. */
export function TabShell() {
  return (
    <Column className="pt-6 pb-32">
      <Suspense fallback={PAGE_LOADING}>
        <Outlet />
      </Suspense>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <ul className="flex items-center justify-between rounded-full bg-night p-2 shadow-lg shadow-night/20">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                aria-label={tab.label}
                onMouseEnter={() => preload(tab.to)}
                onFocus={() => preload(tab.to)}
                className={({ isActive }) =>
                  cx(
                    'flex h-12 items-center gap-2 rounded-full transition',
                    isActive ? 'bg-brand px-5 text-ink' : 'w-12 justify-center text-white/80 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={tab.icon} className="size-5" />
                    {isActive ? <span className="text-sm font-bold">{tab.label}</span> : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </Column>
  );
}
