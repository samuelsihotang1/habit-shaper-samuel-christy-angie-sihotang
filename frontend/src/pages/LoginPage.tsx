import { useState, useTransition, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { AuthShell } from '@/components/Shells';
import { Alert, Button, CodeField, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';
import { identify } from '@/services/auth';

type Step = 'email' | 'password' | 'mfa';

/*
 * Email first, then a password, then (only for an account with MFA) a code.
 * Each step replaces the one before rather than stacking under it: a password
 * left on screen next to the code field invites a second submit, which would
 * only mint a second challenge.
 */
export function LoginPage() {
  const { login, verifyMfa } = useAuth();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await work();
      } catch (caught) {
        setError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      const { data } = await identify(email);
      setNoAccount(!data.exists);
      if (data.exists) setStep('password');
    });
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      const outcome = await login(email, password);
      if (outcome.mfaRequired && outcome.challenge) {
        setChallenge(outcome.challenge);
        setPassword('');
        setStep('mfa');
      }
    });
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    run(async () => {
      try {
        await verifyMfa(challenge, code, trustDevice);
      } catch (caught) {
        // The challenge died (5 minutes, or the password changed): only the password step can mint another.
        if (caught instanceof ApiError && caught.code === 'auth.challengeExpired') {
          setStep('password');
          setCode('');
        }
        throw caught;
      }
    });
  };

  const backToEmail = () => {
    setStep('email');
    setPassword('');
    setError(null);
  };

  if (step === 'mfa') {
    return (
      <AuthShell title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app.">
        <form onSubmit={submitCode} className="space-y-4">
          <CodeField value={code} onChange={setCode} error={error?.field('code')} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(event) => setTrustDevice(event.target.checked)}
              className="size-4 accent-brand"
            />
            Don't ask again on this browser
          </label>
          {error && !error.field('code') ? <Alert>{error.message}</Alert> : null}
          <Button type="submit" busy={pending} className="w-full">
            Verify
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('password'); setCode(''); setError(null); }}>
            Cancel
          </Button>
        </form>
      </AuthShell>
    );
  }

  if (step === 'password') {
    return (
      <AuthShell
        title="Welcome back"
        subtitle={
          <>
            Signing in as <span className="font-medium text-ink">{email}</span>.{' '}
            <button type="button" onClick={backToEmail} className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink cursor-pointer">
              Change
            </button>
          </>
        }
      >
        <form onSubmit={submitPassword} className="space-y-4">
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error?.field('email') ?? error?.field('password')}
            autoComplete="current-password"
            autoFocus
            required
          />
          {error && !error.field('email') && !error.field('password') ? <Alert>{error.message}</Alert> : null}
          <Button type="submit" busy={pending} className="w-full">
            Sign in
          </Button>
          <p className="text-center text-sm">
            <Link to={`/forgot-password?email=${encodeURIComponent(email)}`} className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink">
              Forgot your password?
            </Link>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Enter your email to continue.">
      <form onSubmit={submitEmail} className="space-y-4">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setNoAccount(false);
          }}
          error={error?.field('email')}
          autoComplete="email"
          autoFocus
          required
        />
        {noAccount && (
          <Alert tone="info">
            There is no account for this email.{' '}
            <Link to={`/signup?email=${encodeURIComponent(email)}`} className="font-medium underline">
              Create one
            </Link>
          </Alert>
        )}
        {error && !error.field('email') ? <Alert>{error.message}</Alert> : null}
        <Button type="submit" busy={pending} className="w-full">
          Continue
        </Button>
        <p className="text-center text-sm text-ink-muted">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
