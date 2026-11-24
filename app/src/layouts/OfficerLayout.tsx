import { ReactNode } from 'react';

interface OfficerLayoutProps {
  children: ReactNode;
}

export function OfficerLayout({ children }: OfficerLayoutProps) {
  return (
    <div className="min-h-screen flex flex-row bg-background">
      <aside
        data-testid="officer-sidebar"
        className="w-64 bg-surface border-r border-slate-200 flex flex-col p-4 shrink-0"
      >
        <div className="font-semibold text-primary text-lg mb-6">Trấn Biên Kết Nối</div>
        <nav className="flex-1 space-y-1">
          <div className="px-3 py-2 text-sm font-medium text-text-main rounded-btn bg-slate-100">
            Hộp tiếp nhận
          </div>
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-6 flex flex-col">{children}</main>
    </div>
  );
}
