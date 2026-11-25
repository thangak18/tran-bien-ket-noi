import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UNAUTHORIZED_EVENT } from '@/lib/api';

/**
 * Khi API trả 401 (phiên hết hạn hoặc không hợp lệ), đưa cán bộ/TNV về /dang-nhap
 * kèm đường dẫn đang xem để quay lại sau khi đăng nhập. Người dân dùng ẩn danh thì không bị chuyển trang.
 */
export function AuthEvents() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onUnauthorized = () => {
      const path = location.pathname;
      if (path.startsWith('/can-bo') || path.startsWith('/tnv')) {
        navigate(`/dang-nhap?redirect=${encodeURIComponent(path)}`, { replace: true });
      }
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate, location.pathname]);

  return null;
}
