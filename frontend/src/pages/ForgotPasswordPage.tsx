import { useState, useTransition, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthShell } from '@/components/Shells';
import { Alert, Button, CodeField, TextField } from '@/components/ui';
import { ApiError } from '@/services/api';
import { resetPassword } from '@/services/auth';

const FIELDS = ['email', 'code', 'password', 'password_confirmation'];

/*
 * The authenticator app is the proof of identity here, not an inbox: there is
 * no mail in this stack. An account without MFA cannot reset on its own, and
 * the page says so before anyone types anything.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: params.get('email') ?? '', password: '', password_confirmation: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await resetPassword({ ...form, code });
        await navigate('/login', { replace: true, state: { notice: response.message } });
      } catch (caught) {
        setError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const general = error !== null && !FIELDS.some((field) => error.field(field));

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Use a code from your authenticator app. This works only if two-factor authentication is on for your account."
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={error?.field('email')} autoComplete="email" required />
        <CodeField value={code} onChange={setCode} error={error?.field('code')} />
        <TextField
          label="New password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={error?.field('password')}
          hint="At least 8 characters."
          autoComplete="new-password"
          required
        />
        <TextField
          label="Repeat new password"
          type="password"
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
          error={error?.field('password_confirmation')}
          autoComplete="new-password"
          required
        />
        {general ? <Alert>{error.message}</Alert> : null}
        <Button type="submit" busy={pending} className="w-full">
          Reset password
        </Button>
        <p className="text-center text-sm">
          <Link to="/login" className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
