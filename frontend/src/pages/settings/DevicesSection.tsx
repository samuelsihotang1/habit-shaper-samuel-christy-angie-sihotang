import { useState } from 'react';
import { ActionButton, Alert, Card } from '@/components/ui';
import { useDeviceActions, useDevices } from '@/hooks/useDevices';
import { ApiError } from '@/services/api';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function DevicesSection() {
  const { data: list, error: loadError } = useDevices();
  const { forget, forgetAll } = useDeviceActions();
  const [error, setError] = useState<string | null>(null);

  const attempt = (work: () => Promise<void>) => async () => {
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    }
  };

  const shownError = error ?? (list ? null : (loadError?.message ?? null));

  return (
    <Card title="Trusted browsers" description="These skip the code at sign-in. Remove any you don't recognise.">
      {shownError ? (
        <div className="mb-4">
          <Alert>{shownError}</Alert>
        </div>
      ) : null}
      {list || loadError ? null : <p className="text-sm text-ink-muted">Loading…</p>}
      {list?.length === 0 ? <p className="text-sm text-ink-muted">No trusted browsers.</p> : null}
      {list && list.length > 0 ? (
        <>
          <ul className="divide-y divide-line">
            {list.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink" title={device.user_agent}>
                    {device.user_agent}
                  </p>
                  <p className="text-xs text-ink-muted">Last used {when(device.last_used_at)}</p>
                </div>
                <ActionButton variant="ghost" action={attempt(() => forget(device.id))}>
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
          <ActionButton variant="danger" className="mt-3" action={attempt(forgetAll)}>
            Remove all
          </ActionButton>
        </>
      ) : null}
    </Card>
  );
}
