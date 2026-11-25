import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CITIZEN_LOGIN_REQUIRED_EVENT, UNAUTHORIZED_EVENT } from '@/lib/api';
/**
 * Khi API trả 401 trên một phiên đã hết hạn:
 * - phiên nhân viên → cán bộ/TNV/quản trị về /dang-nhap kèm đường dẫn đang xem;
 * - phiên người dân → về /ho-so?login=1&redirect=<trang hiện tại>, bản nháp giữ nguyên (AC-SESSION-3).
 */
export function AuthEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const current = `${location.pathname}${location.search}`;
    const onUnauthorized = () => {
      const path = location.pathname;
      if (path.startsWith('/can-bo') || path.startsWith('/tnv') || path.startsWith('/quan-tri')) {
        navigate(`/dang-nhap?redirect=${encodeURIComponent(path)}`, { replace: true });
      }
    };
    const onCitizenLogin = () => {
      if (location.pathname === '/ho-so') return;
      navigate(`/ho-so?login=1&redirect=${encodeURIComponent(current)}`, { replace: true });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener(CITIZEN_LOGIN_REQUIRED_EVENT, onCitizenLogin);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener(CITIZEN_LOGIN_REQUIRED_EVENT, onCitizenLogin);
    };
  }, [navigate, location.pathname, location.search]);
  return null;
}
