import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export function ForbiddenScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Cổng định mở (từ ProtectedRoute). Chỉ nhận đường dẫn nội bộ để không bị chuyển ra trang ngoài.
  const rawRedirect = searchParams.get('redirect') || '';
  const redirect = /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FB] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <ShieldAlert className="h-9 w-9" />
        </div>

        <h1 className="text-xl font-bold text-gray-900">403 – Không có quyền truy cập</h1>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Tài khoản hiện tại của bạn không có quyền xem hoặc thao tác trên trang này. Khu vực này
          chỉ dành cho tài khoản có phân quyền tương ứng (Cán bộ, Tình nguyện viên hoặc Quản trị
          viên).
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(
                redirect ? `/dang-nhap?redirect=${encodeURIComponent(redirect)}` : '/dang-nhap'
              )
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-600"
          >
            <LogIn className="h-4 w-4" />
            Đổi tài khoản
          </button>
        </div>
      </div>
    </div>
  );
}
