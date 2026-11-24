import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, User } from 'lucide-react';
import { NavbarCurve } from '@/components/common/NavbarCurve';

interface CitizenLayoutProps {
  children: ReactNode;
}

export function CitizenLayout({ children }: CitizenLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Route /bao-su-co/* ẩn thanh điều hướng đáy
  const isReportFlow = location.pathname.startsWith('/bao-su-co');

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div
        data-testid="citizen-layout-container"
        className="w-full max-w-[430px] min-h-screen bg-background shadow-sm relative flex flex-col pb-20"
      >
        <main className="flex-1 flex flex-col">{children}</main>

        {!isReportFlow && (
          <NavbarCurve
            leftItem={{
              path: '/',
              label: 'Phản ánh',
              icon: ClipboardList,
            }}
            rightItem={{
              path: '/ho-so',
              label: 'Hồ sơ',
              icon: User,
            }}
            centerAction={{
              label: 'Gửi phản ánh',
              onClick: () => navigate('/bao-su-co/anh'),
            }}
          />
        )}
      </div>
    </div>
  );
}
