import { OfficerLayout } from '@/layouts/OfficerLayout';
import { C08Transparency } from '@/screens/citizen/C08Transparency';

export function OfficerStats() {
  return (
    <OfficerLayout>
      <div className="animate-fade-up rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
        <C08Transparency backPath="/can-bo" reportBasePath="/can-bo" />
      </div>
    </OfficerLayout>
  );
}
