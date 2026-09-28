import { act, lazy } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { AppShell } from '@/components/Shells';
import { AuthProvider } from '@/hooks/useAuth';
import { loaders } from '@/pages/lazy';
import { MfaSection } from '@/pages/settings/MfaSection';
import { removeAuthUser, setAuthUser } from '@/utils/cookies';
import { envelope, FreshCache } from './support';

// The factory runs when something first imports qrcode, so the count says when that was.
const qr = vi.hoisted(() => ({ imports: 0 }));
vi.mock('qrcode', () => {
  qr.imports += 1;
  return { toDataURL: async () => 'data:image/png;base64,AAAA', default: { toDataURL: async () => 'data:image/png;base64,AAAA' } };
});

const user = { id: 'u1', name: 'Ana Lee', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  removeAuthUser();
  setAuthUser({ user, token: 'id|secret' });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function render(path: string, routes = <Route path="*" element={<App />} />) {
  await act(async () => {
    root.render(
      <FreshCache>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>{routes}</Routes>
          </AuthProvider>
        </MemoryRouter>
      </FreshCache>,
    );
  });
}

const Forever = lazy(() => new Promise<never>(() => {}));

describe('code splitting', () => {
  it('keeps the shell on screen while a page loads', async () => {
    await render(
      '/',
      <Route element={<AppShell />}>
        <Route path="/" element={<Forever />} />
      </Route>,
    );

    expect(container.firstElementChild?.childElementCount).toBe(1);
    expect(container.querySelector('[aria-busy="true"][aria-label="Loading"]')).not.toBeNull();
  });

  it('loads a page from its own chunk', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(envelope([])));

    await render('/settings');
    await vi.waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('Settings'));
  });

  it('starts loading a page as soon as the pointer or focus reaches its link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(envelope([])));
    const password = vi.spyOn(loaders, 'password');
    await render('/settings');

    const link = await vi.waitFor(() => container.querySelector<HTMLAnchorElement>('a[href="/settings/password"]')!);
    await act(async () => link.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));

    expect(password).toHaveBeenCalled();
  });

  it('loads the QR library only once MFA setup starts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(envelope({ secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' })));
    await render('/', <Route path="/" element={<MfaSection />} />);
    expect(qr.imports).toBe(0);

    const turnOn = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Turn on')!;
    await act(async () => turnOn.click());

    expect(qr.imports).toBe(1);
    await vi.waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA'));
  });
});
