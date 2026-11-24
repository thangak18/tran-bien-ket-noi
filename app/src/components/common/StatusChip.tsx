import React from 'react';
import { Status } from '@/domain/types';
import { STATUS_CONFIGS } from '@/domain/constants';
import {
  Send,
  Inbox,
  Search,
  Wrench,
  CheckCircle2,
  RotateCcw,
  HelpCircle,
  ArrowRight,
  GitMerge,
  XCircle,
} from 'lucide-react';

export interface StatusChipProps {
  status: Status;
  variant?: 'public' | 'officer';
  className?: string;
  size?: 'sm' | 'md';
}

const ICONS: Record<string, React.ReactNode> = {
  Send: <Send className="h-3.5 w-3.5" />,
  Inbox: <Inbox className="h-3.5 w-3.5" />,
  Search: <Search className="h-3.5 w-3.5" />,
  Wrench: <Wrench className="h-3.5 w-3.5" />,
  CheckCircle2: <CheckCircle2 className="h-3.5 w-3.5" />,
  RotateCcw: <RotateCcw className="h-3.5 w-3.5" />,
  HelpCircle: <HelpCircle className="h-3.5 w-3.5" />,
  ArrowRight: <ArrowRight className="h-3.5 w-3.5" />,
  GitMerge: <GitMerge className="h-3.5 w-3.5" />,
  XCircle: <XCircle className="h-3.5 w-3.5" />,
};

// Định dạng: nền nhạt chữ đậm cùng tông, có icon (Chờ tiếp nhận xám, Đã tiếp nhận xanh dương, Đang xử lý cam, Đã xử lý xanh lá)
const STATUS_STYLES: Partial<Record<Status, string>> = {
  moi: 'border-gray-200 bg-gray-100 text-gray-700',
  da_tiep_nhan: 'border-blue-200 bg-[#EFF4FF] text-[#1D4ED8]',
  da_giao: 'border-orange-200 bg-orange-50 text-orange-700',
  cho_xac_minh: 'border-amber-200 bg-amber-50 text-amber-800',
  mo_lai: 'border-orange-200 bg-orange-50 text-orange-700',
  can_bo_sung: 'border-amber-200 bg-amber-50 text-amber-800',
  hoan_thanh: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  dong: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  da_gop: 'border-purple-200 bg-purple-50 text-purple-800',
  khong_xac_nhan: 'border-red-200 bg-red-50 text-red-800',
};

const COLOR_STYLES: Record<string, string> = {
  gray: 'border-gray-200 bg-gray-100 text-gray-700',
  blue: 'border-blue-200 bg-[#EFF4FF] text-[#1D4ED8]',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-950',
  purple: 'border-purple-200 bg-purple-50 text-purple-800',
  red: 'border-red-200 bg-red-50 text-red-800',
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  variant = 'public',
  className = '',
  size = 'md',
}) => {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.moi;
  const label = variant === 'officer' ? config.officerLabel : config.publicLabel;
  const icon = ICONS[config.icon] || <Send className="h-3.5 w-3.5" />;
  const colorClass = STATUS_STYLES[status] || COLOR_STYLES[config.color] || COLOR_STYLES.gray;

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold select-none ${colorClass} ${sizeClass} ${className}`}
    >
      <span className="inline-flex items-center flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
};
