import React, { useState } from 'react';
import { Report, Status } from '@/domain/types';
import { CATEGORY_CONFIGS, STATUS_CONFIGS } from '@/domain/constants';
import { WARD_CENTER } from '@/data/streets';
import { haversineMeters } from '@/domain/geo';
import { formatDistance, formatRelativeTime } from '@/domain/format';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { DelayChip } from '@/components/common/DelayChip';
import { LatestUpdate } from './LatestUpdate';

export interface ReportCardProps {
  report: Report;
  now: string;
  distanceMeters?: number;
  showCode?: boolean;
  onClick?: () => void;
  className?: string;
}

function getCardBadgeMeta(status: Status): { label: string; styleClass: string } {
  const cfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.moi;
  switch (status) {
    case 'moi':
      return {
        label: 'Đã gửi',
        styleClass: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300',
      };
    case 'da_tiep_nhan':
    case 'cho_xac_minh':
      return {
        label: 'Đã tiếp nhận',
        styleClass: 'bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-950/70 dark:text-blue-300',
      };
    case 'da_giao':
    case 'mo_lai':
      return {
        label: 'Đang xử lý',
        styleClass: 'bg-[#FFEDD5] text-[#C2410C] dark:bg-orange-950/70 dark:text-orange-300',
      };
    case 'hoan_thanh':
    case 'dong':
      return {
        label: 'Đã xử lý',
        styleClass: 'bg-[#DCFCE7] text-[#15803D] dark:bg-emerald-950/70 dark:text-emerald-300',
      };
    case 'can_bo_sung':
      return {
        label: 'Cần bổ sung',
        styleClass: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/70 dark:text-amber-300',
      };
    case 'da_gop':
      return {
        label: 'Đã gộp',
        styleClass: 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/70 dark:text-purple-300',
      };
    default:
      return {
        label: cfg.publicLabel,
        styleClass: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300',
      };
  }
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  now,
  distanceMeters,
  showCode = false,
  onClick,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;
  const photo = report.photos && report.photos.length > 0 ? report.photos[0] : null;
  const relativeTime = formatRelativeTime(report.createdAt, now);
  const badge = getCardBadgeMeta(report.status);

  const computedDistance =
    distanceMeters ?? haversineMeters(WARD_CENTER.lat, WARD_CENTER.lng, report.lat, report.lng);
  const distanceLabel = formatDistance(computedDistance);

  return (
    <div
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[var(--color-surface)] p-3.5 transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.995] select-none dark:border-slate-700 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {/* 72x72px rounded-[14px] square photo */}
        <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[14px] bg-[#CBD5E1]/60 dark:bg-slate-800">
          {photo && !imgError ? (
            <img
              src={photo}
              alt={`Ảnh phản ánh ${report.id}`}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-slate-500 select-none">
              <CategoryIcon category={report.category} className="mb-0.5 h-5 w-5 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-500 leading-tight">
                Chưa có ảnh
              </span>
            </div>
          )}
        </div>

        {/* Exact 3-line layout matching Figma Image 2 */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Row 1: Relative time (left) + clean soft status pill (right) */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-[#64748B] dark:text-slate-400">
              {relativeTime}
              {showCode ? ` · #${report.id}` : ''}
            </span>
            <div className="flex flex-shrink-0 items-center gap-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-snug ${badge.styleClass}`}
              >
                {badge.label}
              </span>
              <DelayChip report={report} now={now} />
            </div>
          </div>

          {/* Row 2: Bold 1-line title (prefers report.title, falls back to description or category) */}
          <h3 className="truncate text-[15px] font-extrabold leading-snug text-[var(--color-text)]">
            {report.title || report.description || catConfig.label}
          </h3>
          {report.title && report.description && (
            <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
              {report.description}
            </p>
          )}

          {/* Row 3: Clean 1-line address + distance */}
          <p className="truncate text-[13px] text-[#64748B] dark:text-slate-400">
            {report.address} · {distanceLabel}
          </p>

          {/* Accessible metadata for screen readers & component contract */}
          <div className="sr-only">
            {!showCode && <span>{report.id}</span>}
            {(report.title || report.description) && <span>{catConfig.label}</span>}
            <LatestUpdate report={report} now={now} compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};
