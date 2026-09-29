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
      <path fill="#fff" d="M36.8 12.3Q37.2 12 37 12.4L27.4 39.3Q27.1 40 26.4 40.4L18.1 45.6Q17.5 46 17.7 45.3L21 36.1Q21.4 35 20.2 35L16.2 35Q15.4 35 15.1 34.3L12.8 29.4Q12.6 29 13.1 29L18.6 29Q23.6 29 25.3 24.3L27.3 18.8Q27.5 18 28.2 17.6Z" />
      <path fill="#fff" d="M27.2 51.8Q26.8 52 27 51.5L36.6 24.8Q36.9 24 37.6 23.6L45.9 18.4Q46.5 18 46.3 18.8L43 27.9Q42.6 29 43.8 29L47.8 29Q48.6 29 48.9 29.7L51.2 34.6Q51.4 35 50.9 35L45.4 35Q40.4 35 38.7 39.7L36.7 45.3Q36.5 46 35.8 46.4Z" />
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
 * `dvh`, not `screen`: on a phone `100vh` is the height with the address bar
 * hidden, so a short page still scrolls by the bar's height.
 */
function Column({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto min-h-dvh w-full max-w-[480px] px-5', className)}>{children}</div>;
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
