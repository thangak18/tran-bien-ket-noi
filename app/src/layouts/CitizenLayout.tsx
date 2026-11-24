import { ReactNode } from 'react';

interface CitizenLayoutProps {
  children: ReactNode;
}

export function CitizenLayout({ children }: CitizenLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div
        data-testid="citizen-layout-container"
        className="w-full max-w-[430px] min-h-screen bg-surface shadow-sm relative flex flex-col"
      >
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
