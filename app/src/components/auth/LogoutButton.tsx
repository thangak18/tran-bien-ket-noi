import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clearSession, isApiMode } from '@/lib/api';

/** Đăng xuất: xoá phiên và dữ liệu tài khoản ở thiết bị, về /dang-nhap (AC-LOGIN-6). Chỉ hiện ở chế độ API. */
export function LogoutButton({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  if (!isApiMode()) return null;
  return (
    <button
      type="button"
      onClick={() => {
        clearSession();
        navigate('/dang-nhap', { replace: true });
      }}
      className={`flex items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 ${className}`}
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      Đăng xuất
    </button>
  );
}
