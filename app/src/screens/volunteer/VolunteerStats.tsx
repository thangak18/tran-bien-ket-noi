import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { C08Transparency } from '@/screens/citizen/C08Transparency';

export function VolunteerStats() {
  return (
    <VolunteerLayout>
      <div className="animate-fade-up rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
        <C08Transparency backPath="/tnv/ho-so" reportBasePath="/tnv" />
      </div>
    </VolunteerLayout>
  );
}
