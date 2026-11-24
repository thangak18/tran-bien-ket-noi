import React from 'react';
import { Report } from '@/domain/types';
import { publicTimeline, PublicTimelineStep } from '@/domain/status';
import { Check } from 'lucide-react';

export interface ProgressBarProps {
  report?: Report;
  timelineSteps?: PublicTimelineStep[];
  className?: string;
  compact?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  report,
  timelineSteps,
  className = '',
  compact = false,
}) => {
  const steps = timelineSteps || (report ? publicTimeline(report) : []);

  if (steps.length === 0) return null;

  const formatShortTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <ol role="list" className="relative flex w-full items-start justify-between">
        {/* Thanh nối ngang */}
        <div
          className="absolute top-3.5 left-[10%] right-[10%] h-0.5 bg-gray-200 -z-0"
          aria-hidden="true"
        />

        {steps.map((step) => {
          const isDone = step.status === 'done';
          const isCurrent = step.status === 'current';
          const isUpcoming = step.status === 'upcoming';

          const shortTime = formatShortTime(step.at);

          return (
            <li
              key={step.step}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className="relative z-10 flex flex-1 flex-col items-center text-center px-1"
            >
              {/* Dot */}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all select-none ${
                  isDone
                    ? 'bg-primary text-white shadow-xs'
                    : isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary-100 shadow-sm'
                      : 'border-2 border-gray-300 bg-white text-gray-400'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.step}
              </div>

              {/* Label */}
              <div
                className={`mt-1.5 text-xs font-medium leading-tight ${
                  isCurrent
                    ? 'font-semibold text-primary-dark'
                    : isUpcoming
                      ? 'text-gray-400'
                      : 'text-gray-700'
                }`}
              >
                {compact ? (
                  <span>
                    {step.step === 1
                      ? 'Chờ t.nhận'
                      : step.step === 2
                        ? 'Đã t.nhận'
                        : step.step === 3
                          ? 'Đang xử lý'
                          : 'Đã xử lý'}
                  </span>
                ) : (
                  <span>{step.label}</span>
                )}
              </div>

              {/* Time */}
              {shortTime && (
                <div className="mt-0.5 text-[10px] text-gray-500 font-normal">{shortTime}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
