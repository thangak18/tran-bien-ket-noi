import React from 'react';
import { ImageIcon } from 'lucide-react';
import { formatDate } from '@/domain/format';

export interface BeforeAfterProps {
  beforePhotos: string[];
  afterPhotos?: string[];
  beforeTime?: string;
  afterTime?: string;
  className?: string;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforePhotos,
  afterPhotos,
  beforeTime,
  afterTime,
  className = '',
}) => {
  const beforePhoto = beforePhotos[0];
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
            {beforePhoto ? (
              <img src={beforePhoto} alt="Trước xử lý" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <ImageIcon className="h-8 w-8" />
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
            {afterPhoto ? (
              <img src={afterPhoto} alt="Sau xử lý" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-gray-400">
                <ImageIcon className="h-7 w-7 text-gray-300 mb-1" />
                <span className="text-xs font-medium text-gray-500">Chưa có ảnh sau xử lý</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
