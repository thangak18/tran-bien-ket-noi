import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('can_bo' | 'tnv' | 'citizen')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('tbkn_auth_token');
  const role = localStorage.getItem('tbkn_user_role') as 'can_bo' | 'tnv' | 'citizen' | null;

  // In demo mode or if no token yet, allow access or redirect to login
  if (!token || !role) {
    // If accessing officer/volunteer paths, redirect to login
    return <Navigate to={`/dang-nhap?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/khong-co-quyen" replace />;
  }

  return <>{children}</>;
}
