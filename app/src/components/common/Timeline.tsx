import React from 'react';
import { Report } from '@/domain/types';
import { publicTimeline } from '@/domain/status';
import { formatDateShort, formatDateTime } from '@/domain/format';
import { Check, Clock, GitMerge, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';

export interface TimelineProps {
  report: Report;
  now: string;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ report, className = '' }) => {
  const steps = publicTimeline(report);

  return (
    <div className={`w-full ${className}`}>
      {/* Băng ngoại lệ (Exception Banner) */}
      {report.status === 'da_gop' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-purple-200 bg-purple-50 p-3.5 text-sm text-purple-950">
          <GitMerge className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              Phản ánh này đã được gộp vào hồ sơ {report.mergedInto || ''}
            </div>
            <div className="text-xs text-purple-800 mt-0.5">
              Để theo dõi tiến độ giải quyết sự cố, vui lòng xem hồ sơ chính.
            </div>
          </div>
        </div>
      )}

      {report.status === 'can_bo_sung' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">
          <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Cần bổ sung thông tin</div>
            <div className="text-xs text-amber-800 mt-0.5">
              {report.timeline.find((t) => t.status === 'can_bo_sung')?.note ||
                'Vui lòng cung cấp thêm hình ảnh hoặc thông tin rõ hơn.'}
            </div>
          </div>
        </div>
      )}

      {report.status === 'chuyen_co_quan' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-950">
          <ArrowRight className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Đã chuyển cơ quan chuyên môn</div>
            <div className="text-xs text-blue-800 mt-0.5">
              {report.timeline.find((t) => t.status === 'chuyen_co_quan')?.note ||
                'Sự cố đã được chuyển đến đơn vị có thẩm quyền giải quyết.'}
            </div>
          </div>
        </div>
      )}

      {report.status === 'khong_xac_nhan' && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-sm text-gray-800">
          <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Không xác nhận sự cố</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {report.timeline.find((t) => t.status === 'khong_xac_nhan')?.note ||
                'Hiện trường đã được kiểm tra và không phát hiện sự cố như mô tả.'}
            </div>
          </div>
        </div>
      )}

      {/* Vertical Steps */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
        {steps.map((step) => {
          const isDone = step.status === 'done';
          const isCurrent = step.status === 'current';
          const isUpcoming = step.status === 'upcoming';

          const formattedTime = step.at ? formatDateTime(step.at) : undefined;
          const expectedDateStr = step.expected ? formatDateShort(step.expected) : undefined;

          return (
            <div
              key={step.step}
              className={`timeline-step relative flex items-start gap-3.5 ${
                isUpcoming ? 'opacity-60' : ''
              }`}
            >
              {/* Node Icon */}
              <div
                className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-primary text-white shadow-xs'
                    : isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary-100'
                      : 'border-2 border-gray-300 bg-white text-gray-400'
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : isCurrent ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
              </div>

              {/* Step info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <div
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? 'text-primary-dark'
                        : isUpcoming
                          ? 'text-gray-500'
                          : 'text-gray-900'
                    }`}
                  >
                    <span>{step.label}</span>
                    {isUpcoming && expectedDateStr && (
                      <span className="ml-1.5 text-xs font-normal text-gray-500">
                        (dự kiến {expectedDateStr})
                      </span>
                    )}
                  </div>
                  {formattedTime && <div className="text-xs text-gray-500">{formattedTime}</div>}
                </div>

                {step.department && (
                  <div className="mt-0.5 text-xs text-gray-700 font-medium">{step.department}</div>
                )}

                {step.note && <div className="mt-0.5 text-xs text-gray-500">{step.note}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
