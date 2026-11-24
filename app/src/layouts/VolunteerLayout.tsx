import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, User } from 'lucide-react';
import { NavbarCurve } from '@/components/common/NavbarCurve';
import { DesktopHeader } from '@/components/common/DesktopHeader';

interface VolunteerLayoutProps {
  children: ReactNode;
}

export function VolunteerLayout({ children }: VolunteerLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans">
      {/* Header Desktop (>= 1024px) */}
      <DesktopHeader role="volunteer" />

      {/* Responsive Container:
          - Mobile (< 768px): max-w-[430px]
          - Tablet (768-1023px): max-w-[720px]
          - Desktop (>= 1024px): w-full max-w-none
      */}
      <div
        data-testid="volunteer-layout-container"
        className="w-full max-w-[430px] md:max-w-[720px] lg:max-w-none flex-1 flex flex-col mx-auto"
      >
        <main className="flex-1 flex flex-col">{children}</main>

        <div className="lg:hidden">
          <NavbarCurve
            leftItem={{
              path: '/tnv',
              label: 'Nhiệm vụ',
              icon: CheckSquare,
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
      </div>
    </div>
  );
}
