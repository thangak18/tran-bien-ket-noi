import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

export interface StepHeaderProps {
  currentStep: 1 | 2 | 3;
  onBack?: () => void;
  onCancel: () => void;
  title?: string;
  className?: string;
}

const STEP_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Chụp ảnh',
  2: 'Vị trí',
  3: 'Xác nhận',
};

export const StepHeader: React.FC<StepHeaderProps> = ({
  currentStep,
  onBack,
  onCancel,
  title,
  className = '',
}) => {
  const stepName = title || STEP_TITLES[currentStep];

  return (
    <header
      className={`w-full border-b border-gray-100 bg-white px-4 py-3 select-none ${className}`}
    >
      {/* Hàng 1: Nút điều hướng + Thanh chỉ báo bước + Nút huỷ */}
      <div className="flex items-center justify-between">
        {/* Nút quay lại */}
        <div className="w-10">
          {currentStep > 1 && onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Quay lại"
              className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {/* Chỉ báo bước ①──②──③ */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((s, idx) => {
            const isPassed = s < currentStep;
            const isCurrent = s === currentStep;
            return (
              <React.Fragment key={s}>
                {idx > 0 && (
                  <div
                    className={`h-0.5 w-6 transition-colors ${
                      s <= currentStep ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isPassed || isCurrent
                      ? 'bg-primary text-white shadow-xs'
                      : 'border border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {s}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Nút huỷ */}
        <div className="w-10 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Huỷ"
            className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hàng 2: Tên bước */}
      <div className="mt-1.5 text-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Bước {currentStep}/3 – {stepName}
        </h2>
      </div>
    </header>
  );
};
