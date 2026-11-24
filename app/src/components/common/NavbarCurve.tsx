import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Camera } from 'lucide-react';

export interface NavCurveItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavbarCurveProps {
  leftItem: NavCurveItem;
  rightItem: NavCurveItem;
  centerAction: {
    label: string;
    onClick: () => void;
  };
}

export const NavbarCurve: React.FC<NavbarCurveProps> = ({ leftItem, rightItem, centerAction }) => {
  const location = useLocation();

  const isLeftActive =
    leftItem.path === '/'
      ? location.pathname === '/' || location.pathname.startsWith('/phan-anh')
      : location.pathname.startsWith(leftItem.path);

  const isRightActive = location.pathname.startsWith(rightItem.path);

  const LeftIcon = leftItem.icon;
  const RightIcon = rightItem.icon;

  return (
    <nav
      data-testid="citizen-bottom-nav"
      className="fixed bottom-0 z-40 w-full max-w-[430px] rounded-t-[20px] border-t border-gray-100 bg-white px-6 pb-2 pt-2 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]"
    >
      <div className="flex items-center justify-between">
        {/* Mục trái (Phản ánh / Nhiệm vụ) */}
        <Link
          to={leftItem.path}
          className={`flex flex-col items-center justify-center min-w-[64px] py-1 text-xs font-medium transition-colors ${
            isLeftActive ? 'text-primary font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <LeftIcon className="h-6 w-6 mb-1" />
          <span>{leftItem.label}</span>
        </Link>

        {/* Nút tròn nổi giữa 56px */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            data-testid="fab-report"
            aria-label={centerAction.label}
            onClick={centerAction.onClick}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Camera className="h-6 w-6" />
          </button>
          <span className="mt-1 text-[11px] font-semibold text-primary">{centerAction.label}</span>
        </div>

        {/* Mục phải (Hồ sơ) */}
        <Link
          to={rightItem.path}
          className={`flex flex-col items-center justify-center min-w-[64px] py-1 text-xs font-medium transition-colors ${
            isRightActive ? 'text-primary font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <RightIcon className="h-6 w-6 mb-1" />
          <span>{rightItem.label}</span>
        </Link>
      </div>
    </nav>
  );
};
