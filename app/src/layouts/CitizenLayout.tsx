import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, User } from 'lucide-react';
import { NavbarCurve } from '@/components/common/NavbarCurve';
import { DesktopHeader } from '@/components/common/DesktopHeader';

interface CitizenLayoutProps {
  children: ReactNode;
}

export function CitizenLayout({ children }: CitizenLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Route /bao-su-co/* ẩn thanh điều hướng đáy
  const isReportFlow = location.pathname.startsWith('/bao-su-co');

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans">
      {/* Header Desktop (>= 1024px) */}
      <DesktopHeader role="citizen" />

      {/* Responsive Container:
          - Mobile (< 768px): max-w-[430px]
          - Tablet (768-1023px): max-w-[720px]
          - Desktop (>= 1024px): w-full max-w-none
      */}
      <div
        data-testid="citizen-layout-container"
        className="w-full max-w-[430px] md:max-w-[720px] lg:max-w-none flex-1 flex flex-col mx-auto"
      >
        <main className="flex-1 flex flex-col">{children}</main>

        {!isReportFlow && (
          <div className="lg:hidden">
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
          </div>
        )}
      </div>
    </div>
  );
}
