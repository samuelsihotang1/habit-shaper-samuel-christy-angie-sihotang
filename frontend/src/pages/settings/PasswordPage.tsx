import { PageHeader } from '@/components/ui';
import { PasswordSection } from '@/pages/settings/PasswordSection';

export function PasswordPage() {
  return (
    <div>
      <PageHeader title="Password" back="/settings" />
      <PasswordSection />
    </div>
  );
}
