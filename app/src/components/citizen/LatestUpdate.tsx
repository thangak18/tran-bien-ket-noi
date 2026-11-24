import React from 'react';
import { Report } from '@/domain/types';
import { formatLatestUpdate } from '@/domain/latestUpdate';
import { BellRing } from 'lucide-react';

export interface LatestUpdateProps {
  report: Report;
  now: string;
  compact?: boolean;
  className?: string;
}

export const LatestUpdate: React.FC<LatestUpdateProps> = ({
  report,
  now,
  compact = false,
  className = '',
}) => {
  const updateText = formatLatestUpdate(report, now);

  if (compact) {
    return <p className={`line-clamp-1 text-xs text-gray-600 ${className}`}>{updateText}</p>;
  }

  return (
    <div
      className={`rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-sm shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-2 font-semibold text-blue-950 mb-1">
        <BellRing className="h-4 w-4 text-primary" />
        <span>Cập nhật mới nhất</span>
      </div>
      <p className="text-xs text-blue-900 leading-relaxed">{updateText}</p>
    </div>
  );
};
