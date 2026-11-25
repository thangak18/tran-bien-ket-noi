import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('can_bo' | 'tnv' | 'admin' | 'citizen')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const isApi = import.meta.env.VITE_DATA_SOURCE === 'api';

  // Trong chế độ local / test router mặc định không chặn route để bảo toàn hành vi prototype Giai đoạn 1 (Spec 16.1)
  if (!isApi) {
    return <>{children}</>;
  }

  const token =
    localStorage.getItem('tb_staff_token') ||
    localStorage.getItem('tb_citizen_token') ||
    localStorage.getItem('tbkn_auth_token');
  const role = localStorage.getItem('tbkn_user_role') as
    | 'can_bo'
    | 'tnv'
    | 'admin'
    | 'citizen'
    | null;

  // Nếu chưa có token hoặc chưa chọn vai trò, chuyển hướng sang trang đăng nhập
  if (!token || !role) {
    return <Navigate to={`/dang-nhap?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/khong-co-quyen" replace />;
  }

  return <>{children}</>;
}
