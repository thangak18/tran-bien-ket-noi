import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { applySeniorMode } from '@/lib/senior';

interface DesktopHeaderProps {
  role?: 'citizen' | 'volunteer';
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ role = 'citizen' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const seniorMode = state.settings.seniorMode;

  const toggleSeniorMode = () => {
    const next = !seniorMode;
    dispatch({ type: 'SET_SETTINGS', payload: { seniorMode: next } });
    applySeniorMode(next);
  };

  const citizenNavItems = [
    { label: 'Phản ánh', path: '/' },
    { label: 'Bản đồ', path: '/quanh-day' },
    { label: 'Kết quả phường', path: '/minh-bach' },
    { label: 'Hồ sơ', path: '/ho-so' },
  ];

  const volunteerNavItems = [
    { label: 'Nhiệm vụ', path: '/tnv' },
    { label: 'Bản đồ', path: '/quanh-day' },
    { label: 'Kết quả phường', path: '/minh-bach' },
    { label: 'Hồ sơ', path: '/ho-so' },
  ];

  const navItems = role === 'volunteer' ? volunteerNavItems : citizenNavItems;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-30 hidden h-16 w-full border-b border-[#E5E7EB] bg-white shadow-soft lg:block">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        {/* Trái: Logo + Trấn Biên Kết Nối */}
        <div
          onClick={() => navigate(role === 'volunteer' ? '/tnv' : '/')}
          className="flex cursor-pointer items-center gap-3 select-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-white shadow-soft">
            TB
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">Trấn Biên Kết Nối</div>
            <div className="text-[11px] font-medium text-gray-500">
              {role === 'volunteer' ? 'Cổng Tình nguyện viên' : 'Phường Trấn Biên'}
            </div>
          </div>
        </div>

        {/* Giữa: Menu */}
        <nav className="flex h-full items-center gap-8">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`relative flex h-full items-center text-sm font-medium transition-colors ${
                  active
                    ? 'border-b-2 border-primary font-semibold text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Phải: Aa Chữ lớn + Tìm kiếm thu gọn + Nút Gửi phản ánh */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Chế độ chữ lớn"
            onClick={toggleSeniorMode}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              seniorMode
                ? 'border-primary bg-primary text-white shadow-soft'
                : 'border-[#E5E7EB] bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="font-bold text-sm">Aa</span>
            <span>Chữ lớn</span>
          </button>

          <button
            type="button"
            aria-label="Tìm kiếm phản ánh"
            onClick={() => navigate('/tim-kiem')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/bao-su-co/anh')}
            className="flex items-center gap-1.5 rounded-btn bg-primary px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            <span>📷</span>
            <span>Gửi phản ánh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
