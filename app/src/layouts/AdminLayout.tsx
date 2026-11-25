import {
  LayoutDashboard,
  LogOut,
  Settings2,
  Shield,
  Users,
  Building2,
  ClipboardList,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearStaffSession, isApiMode } from '../lib/api';

const links = [
  { to: '/quan-tri', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/quan-tri/tai-khoan', label: 'Tài khoản', icon: Users },
  { to: '/quan-tri/bo-phan', label: 'Bộ phận', icon: Building2 },
  { to: '/quan-tri/cau-hinh', label: 'Cấu hình xử lý', icon: Settings2 },
  { to: '/quan-tri/nhat-ky', label: 'Nhật ký', icon: ClipboardList },
];

export function AdminLayout() {
  const navigate = useNavigate();

  if (!isApiMode()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4">
        <section className="w-full max-w-lg rounded-xl border border-blue-100 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900">Cần chế độ API</h1>
          <p className="mt-2 text-sm text-gray-600">
            Trang quản trị cần kết nối API. Hãy chạy ứng dụng với <code>VITE_DATA_SOURCE=api</code>.
          </p>
          <button
            type="button"
            className="mt-6 font-semibold text-primary hover:underline"
            onClick={() => navigate('/')}
          >
            Quay lại trang chủ
          </button>
        </section>
      </main>
    );
  }

  const displayName = localStorage.getItem('tbkn_user_name') || 'Quản trị viên';

  const navigation = (
    <nav className="flex w-max gap-1 lg:w-full lg:flex-col" aria-label="Điều hướng quản trị">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition ${
              isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FB] font-sans">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white">
            TB
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">Trấn Biên Kết Nối</p>
            <p className="text-xs font-medium text-gray-500">Cổng quản trị</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-48 truncate text-sm font-semibold text-gray-700 sm:block">
            {displayName}
          </span>
          <button
            type="button"
            aria-label="Đăng xuất"
            onClick={() => {
              clearStaffSession();
              navigate('/dang-nhap', { replace: true });
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] lg:min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-4 lg:block">
          <div className="space-y-1">{navigation}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
            <div className="flex gap-1 overflow-x-auto">{navigation}</div>
          </div>
          <main className="mx-auto w-full max-w-[1180px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
