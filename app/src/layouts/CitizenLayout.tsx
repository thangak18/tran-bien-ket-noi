import { ReactNode } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Home, FileText, Camera, MapPin, BarChart3 } from 'lucide-react';

interface CitizenLayoutProps {
  children: ReactNode;
}

export function CitizenLayout({ children }: CitizenLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Route /bao-su-co/* ẩn thanh điều hướng đáy (CT-002, AC-NAV-1)
  const isReportFlow = location.pathname.startsWith('/bao-su-co');

  const navItems = [
    { path: '/', label: 'Trang chủ', icon: Home },
    { path: '/cua-toi', label: 'Của tôi', icon: FileText },
    // FAB ở giữa index 2
    { path: '/quanh-day', label: 'Bản đồ', icon: MapPin },
    { path: '/minh-bach', label: 'Kết quả', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div
        data-testid="citizen-layout-container"
        className="w-full max-w-[430px] min-h-screen bg-surface shadow-sm relative flex flex-col pb-20"
      >
        <main className="flex-1 flex flex-col">{children}</main>

        {!isReportFlow && (
          <nav
            data-testid="citizen-bottom-nav"
            className="fixed bottom-0 z-40 w-full max-w-[430px] border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-1.5 flex items-center justify-between"
          >
            {/* 2 tab bên trái */}
            <div className="flex flex-1 justify-around">
              {navItems.slice(0, 2).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'text-primary font-semibold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-0.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* FAB nút tròn 64px ở giữa nhô lên 16px */}
            <div className="relative -top-4 flex flex-col items-center px-2">
              <button
                type="button"
                data-testid="fab-report"
                aria-label="Báo sự cố"
                onClick={() => navigate('/bao-su-co/anh')}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Camera className="h-7 w-7" />
              </button>
              <span className="mt-1 text-[11px] font-semibold text-primary">Báo sự cố</span>
            </div>

            {/* 2 tab bên phải */}
            <div className="flex flex-1 justify-around">
              {navItems.slice(2, 4).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'text-primary font-semibold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-0.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
