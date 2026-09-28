import { useState, useTransition, type FormEvent } from 'react';
import { Alert, Button, Card, CodeField, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';
import { confirmMfa, disableMfa, startMfa } from '@/services/account';
import type { MfaSetup } from '@/types/auth';

/*
 * The QR code is drawn in this browser. Sending the otpauth URL to a QR
 * service would hand the shared secret, the whole second factor, to a stranger.
 * The drawing library is its own chunk: only setting MFA up needs it, and
 * pointing at "Turn on" starts the download.
 */
const loadQr = () => import('qrcode');

export function MfaSection() {
  const { user, replaceUser } = useAuth();
  const [setup, setSetup] = useState<(MfaSetup & { qr: string | null }) | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await work();
      } catch (caught) {
        setError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const reset = () => {
    setSetup(null);
    setDisabling(false);
    setCode('');
    setPassword('');
    setError(null);
  };

  // Drawn here, once, from the answer: the key below it still works if drawing fails.
  const begin = () =>
    run(async () => {
      const [{ data }, QRCode] = await Promise.all([startMfa(), loadQr()]);
      const qr = await QRCode.toDataURL(data.otpauth_url, { margin: 1, width: 192 }).catch(() => null);
      setSetup({ ...data, qr });
    });

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      const response = await confirmMfa(code);
      replaceUser(response.data);
      reset();
      setNotice(response.message ?? 'Two-factor authentication is on.');
    });
  };

  const disable = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      const response = await disableMfa({ password, code });
      replaceUser(response.data);
      reset();
      setNotice(response.message ?? 'Two-factor authentication is off.');
    });
  };

  const general = error !== null && !error.field('code') && !error.field('password');

  return (
    <Card
      title="Two-factor authentication"
      description="Sign-in asks for a code from an authenticator app. It is also how you reset a forgotten password."
    >
      {notice ? (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      {user?.mfa_enabled && !disabling ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">On</span>
          <Button
            variant="danger"
            onClick={() => {
              reset();
              setDisabling(true);
            }}
          >
            Turn off
          </Button>
        </div>
      ) : null}

      {user?.mfa_enabled && disabling ? (
        <form onSubmit={disable} className="space-y-4">
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error?.field('password')}
            autoComplete="current-password"
            required
          />
          <CodeField value={code} onChange={setCode} error={error?.field('code')} />
          {general ? <Alert>{error.message}</Alert> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" busy={pending}>
              Turn off two-factor
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {!user?.mfa_enabled && !setup ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink-muted">Off</span>
            <Button onClick={begin} onMouseEnter={() => void loadQr()} onFocus={() => void loadQr()} busy={pending}>
              Turn on
            </Button>
          </div>
          {general ? <Alert>{error.message}</Alert> : null}
        </div>
      ) : null}

      {!user?.mfa_enabled && setup ? (
        <form onSubmit={confirm} className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-muted">
            <li>Scan this code with Google Authenticator, 1Password, Authy or a similar app.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {setup.qr ? <img src={setup.qr} alt="QR code for your authenticator app" className="size-48 rounded-2xl border border-line" /> : null}
            <div className="min-w-0 text-sm">
              <p className="text-ink-muted">Can't scan? Enter this key instead:</p>
              <code className="mt-1 block break-all rounded-xl bg-canvas px-2 py-1.5 font-mono text-ink">{setup.secret}</code>
            </div>
          </div>
          <div>
            <CodeField value={code} onChange={setCode} error={error?.field('code')} />
          </div>
          {general ? <Alert>{error.message}</Alert> : null}
          <div className="flex gap-2">
            <Button type="submit" busy={pending}>
              Confirm and turn on
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
