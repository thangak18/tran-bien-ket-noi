import React from 'react';
import { Report } from '@/domain/types';
import { computeDelayDays } from '@/domain/latestUpdate';
import { Clock } from 'lucide-react';

export interface DelayChipProps {
  report?: Report;
  now?: string;
  delayDays?: number;
  className?: string;
}

export const DelayChip: React.FC<DelayChipProps> = ({
  report,
  now,
  delayDays: explicitDelayDays,
  className = '',
}) => {
  const delayDays =
    explicitDelayDays !== undefined
      ? explicitDelayDays
      : report && now
        ? computeDelayDays(report, now)
        : 0;

  if (delayDays <= 0) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 select-none ${className}`}
    >
      <Clock className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
      <span>Chậm {delayDays} ngày</span>
    </span>
  );
};
