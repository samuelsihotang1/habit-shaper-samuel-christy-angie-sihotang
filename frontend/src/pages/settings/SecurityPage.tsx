import { PageHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { DevicesSection } from '@/pages/settings/DevicesSection';
import { MfaSection } from '@/pages/settings/MfaSection';

export function SecurityPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <PageHeader title="Two-factor and browsers" back="/settings" />
      <MfaSection />
      {user?.mfa_enabled ? <DevicesSection /> : null}
    </div>
  );
}
