import { Suspense, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router';
import { cx } from '@/components/ui';

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

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 text-lg font-bold text-ink">
      <LogoMark />
      Habit <span className="-ml-1.5 text-brand-strong">Shaper</span>
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
 * inside each shell, so the shell stays on screen rather than blanking with the page.
 */
const PAGE_LOADING = <div className="h-72 animate-pulse rounded-3xl bg-surface" aria-busy="true" aria-label="Loading" />;

/** Signed-in screens: settings, and the forms behind it, which have a back arrow. */
export function AppShell() {
  return (
    <Column className="pt-6 pb-10">
      <Suspense fallback={PAGE_LOADING}>
        <Outlet />
      </Suspense>
    </Column>
  );
}
