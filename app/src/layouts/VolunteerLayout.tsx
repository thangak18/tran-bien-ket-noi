import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, User } from 'lucide-react';
import { NavbarCurve } from '@/components/common/NavbarCurve';

interface VolunteerLayoutProps {
  children: ReactNode;
}

export function VolunteerLayout({ children }: VolunteerLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div
        data-testid="volunteer-layout-container"
        className="w-full max-w-[430px] min-h-screen bg-background shadow-sm relative flex flex-col pb-20"
      >
        <main className="flex-1 flex flex-col">{children}</main>

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
  );
}
