import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Category } from '@/domain/types';
import { CategoryIcon } from '@/components/common/CategoryIcon';

export interface BeforeAfterProps {
  beforePhotos: string[];
  afterPhotos?: string[];
  beforeTime?: string;
  afterTime?: string;
  category?: Category;
  className?: string;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforePhotos,
  afterPhotos,
  category,
  className = '',
}) => {
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);

  const beforePhoto = beforePhotos && beforePhotos.length > 0 ? beforePhotos[0] : null;
  const afterPhoto = afterPhotos && afterPhotos.length > 0 ? afterPhotos[0] : null;

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        {/* Trước */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xs dark:border-slate-700">
          {beforePhoto && !beforeError ? (
            <img
              src={beforePhoto}
              alt="Trước xử lý"
              onError={() => setBeforeError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[var(--color-text-muted)] select-none">
              <CategoryIcon
                category={category}
                className="h-7 w-7 text-[var(--color-text-muted)] mb-1"
              />
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                Chưa có ảnh
              </span>
            </div>
          )}
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-bold text-white">
            Trước
          </span>
        </div>

        {/* Sau xử lý */}
        <div
          className={`relative aspect-4/3 w-full overflow-hidden rounded-2xl border shadow-2xs ${
            afterPhoto && !afterError
              ? 'border-[#15803D] bg-[var(--color-surface-elevated)]'
              : 'border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60'
          }`}
        >
          {!afterPhoto ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[var(--color-text-muted)] select-none">
              <ImageIcon className="h-7 w-7 text-[var(--color-text-muted)] opacity-60 mb-1" />
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                Chưa có ảnh sau xử lý
              </span>
            </div>
          ) : afterError ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[var(--color-text-muted)] select-none">
              <CategoryIcon
                category={category}
                className="h-7 w-7 text-[var(--color-text-muted)] mb-1"
              />
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                Chưa có ảnh
              </span>
            </div>
          ) : (
            <>
              <img
                src={afterPhoto}
                alt="Sau xử lý"
                onError={() => setAfterError(true)}
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-[#15803D] px-2.5 py-0.5 text-[11px] font-bold text-white">
                Sau xử lý
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
