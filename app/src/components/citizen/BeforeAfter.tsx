import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Category } from '@/domain/types';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { formatDate } from '@/domain/format';

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
  beforeTime,
  afterTime,
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
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1.5 px-0.5">
            <span>Trước</span>
            {beforeTime && (
              <span className="text-gray-400 font-normal">{formatDate(beforeTime)}</span>
            )}
          </div>
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xs">
            {beforePhoto && !beforeError ? (
              <img
                src={beforePhoto}
                alt="Trước xử lý"
                onError={() => setBeforeError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-gray-400 select-none">
                <CategoryIcon category={category} className="h-7 w-7 text-gray-400 mb-1" />
                <span className="text-xs font-medium text-gray-500">Chưa có ảnh</span>
              </div>
            )}
          </div>
        </div>

        {/* Sau */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1.5 px-0.5">
            <span>Sau</span>
            {afterTime && (
              <span className="text-gray-400 font-normal">{formatDate(afterTime)}</span>
            )}
          </div>
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 shadow-2xs">
            {!afterPhoto ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-gray-400 select-none">
                <ImageIcon className="h-7 w-7 text-gray-300 mb-1" />
                <span className="text-xs font-medium text-gray-500">Chưa có ảnh sau xử lý</span>
              </div>
            ) : afterError ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-gray-400 select-none">
                <CategoryIcon category={category} className="h-7 w-7 text-gray-400 mb-1" />
                <span className="text-xs font-medium text-gray-500">Chưa có ảnh</span>
              </div>
            ) : (
              <img
                src={afterPhoto}
                alt="Sau xử lý"
                onError={() => setAfterError(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
