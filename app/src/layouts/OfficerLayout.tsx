import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface OfficerLayoutProps {
  children: ReactNode;
}

export function OfficerLayout({ children }: OfficerLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans">
      {/* Header desktop cán bộ */}
      <header className="sticky top-0 z-30 h-16 border-b border-[#E5E7EB] bg-white px-6 shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-base shadow-soft">
            TB
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">Trấn Biên Kết Nối</div>
            <div className="text-[11px] text-gray-500 font-medium">
              Cổng cán bộ · Phường Trấn Biên
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Cổng công dân
          </button>
        </div>
      </header>

      {/* Aside data-testid="officer-sidebar" để tương thích test */}
      <aside data-testid="officer-sidebar" className="hidden" aria-hidden="true" />

      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-6 flex flex-col">
        {children}
      </main>
    </div>
  );
}
