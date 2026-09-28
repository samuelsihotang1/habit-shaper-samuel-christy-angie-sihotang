import { useState, useTransition, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AuthShell } from '@/components/Shells';
import { Alert, Button, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';

const FIELDS = ['name', 'email', 'password', 'password_confirmation'];

export function SignUpPage() {
  const { register } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: params.get('email') ?? '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await register(form);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const general = error !== null && !FIELDS.some((field) => error.field(field));

  return (
    <AuthShell title="Create your account" subtitle="No email verification. You can start right away.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Name" value={form.name} onChange={set('name')} error={error?.field('name')} autoComplete="name" required />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={error?.field('email')}
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={error?.field('password')}
          hint="At least 8 characters."
          autoComplete="new-password"
          required
        />
        <TextField
          label="Repeat password"
          type="password"
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
          error={error?.field('password_confirmation')}
          autoComplete="new-password"
          required
        />
        {general ? <Alert>{error.message}</Alert> : null}
        <Button type="submit" busy={pending} className="w-full">
          Create account
        </Button>
        <p className="text-center text-sm text-ink-muted">
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
