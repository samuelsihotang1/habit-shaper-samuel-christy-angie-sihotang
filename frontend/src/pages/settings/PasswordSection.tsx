import { useState, useTransition, type FormEvent } from 'react';
import { Alert, Button, Card, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';
import { changePassword } from '@/services/account';

const EMPTY = { current_password: '', password: '', password_confirmation: '' };

const FIELDS = Object.keys(EMPTY);

export function PasswordSection() {
  const { replaceUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        const response = await changePassword(form);
        replaceUser(response.data);
        setForm(EMPTY);
        setDone(response.message ?? 'Password changed.');
      } catch (caught) {
        setError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const general = error !== null && !FIELDS.some((field) => error.field(field));

  return (
    <Card title="Password" description="Changing it signs you out everywhere else.">
      <form onSubmit={submit} className="space-y-4">
        <TextField
          label="Current password"
          type="password"
          value={form.current_password}
          onChange={set('current_password')}
          error={error?.field('current_password')}
          autoComplete="current-password"
          required
        />
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
        {done ? <Alert tone="success">{done}</Alert> : null}
        <Button type="submit" busy={pending} className="w-full">
          Change password
        </Button>
      </form>
    </Card>
  );
}
