import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, X } from 'lucide-react';

const ROLES = [
  {
    label: 'Người dân',
    path: '/',
    match: (p: string) => !p.startsWith('/can-bo') && !p.startsWith('/tnv'),
  },
  { label: 'Cán bộ', path: '/can-bo', match: (p: string) => p.startsWith('/can-bo') },
  { label: 'Tình nguyện viên', path: '/tnv', match: (p: string) => p.startsWith('/tnv') },
];

/** Nút nổi cho ban giám khảo: chuyển nhanh giữa 3 nhóm người dùng khi demo */
export function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = ROLES.find((r) => r.match(pathname));

  if (import.meta.env.VITE_DATA_SOURCE === 'api') {
    return null;
  }

  return (
    <div
      className="fixed bottom-24 right-3 z-[1500] lg:bottom-5 lg:right-5"
      data-testid="role-switcher"
    >
      {open ? (
        <div className="w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-xs font-bold text-gray-500">Xem với vai trò</span>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {ROLES.map((r) => (
            <button
              key={r.path}
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(r.path);
              }}
              className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold last:mb-0 ${
                current?.path === r.path
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-primary-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-primary-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-primary shadow-lg backdrop-blur-sm hover:bg-primary-50"
        >
          <Users className="h-4 w-4" />
          Đổi vai trò
        </button>
      )}
    </div>
  );
}
