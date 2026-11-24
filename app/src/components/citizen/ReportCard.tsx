import React from 'react';
import { Report } from '@/domain/types';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { LatestUpdate } from './LatestUpdate';
import { Card } from '@/components/ui/Card';
import { MapPin, Users } from 'lucide-react';

export interface ReportCardProps {
  report: Report;
  now: string;
  onClick?: () => void;
  className?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, now, onClick, className = '' }) => {
  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;
  const photo = report.photos[0] || `/demo-photos/${report.category}/1.jpg`;

  return (
    <Card
      onClick={onClick}
      className={`overflow-hidden transition-all hover:shadow-md active:scale-[0.99] select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex gap-3.5 items-start">
        {/* Ảnh thumbnail */}
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
          <img
            src={photo}
            alt={`Ảnh phản ánh ${report.id}`}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Nội dung chính */}
        <div className="flex-1 min-w-0">
          {/* Hàng 1: Mã + Loại + Chips */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-gray-900">{report.id}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs font-semibold text-gray-700">{catConfig.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <StatusChip status={report.status} size="sm" />
              <DelayChip report={report} now={now} />
            </div>
          </div>

          {/* Địa chỉ 1 dòng */}
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{report.address}</span>
          </div>

          {/* Cập nhật mới nhất 1 dòng */}
          <LatestUpdate report={report} now={now} compact={true} />

          {/* Người cùng theo dõi */}
          {report.followers.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
              <Users className="h-3 w-3 text-gray-400" />
              <span>{report.followers.length} người cùng theo dõi</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
