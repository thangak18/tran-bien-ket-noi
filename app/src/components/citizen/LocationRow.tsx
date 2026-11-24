import React from 'react';
import { MapPin } from 'lucide-react';
import { formatDistance } from '@/domain/format';

export interface LocationRowProps {
  address: string;
  distanceMeters?: number;
  onChange?: () => void;
  className?: string;
}

export const LocationRow: React.FC<LocationRowProps> = ({
  address,
  distanceMeters,
  onChange,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-3.5 py-2.5 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="truncate text-sm text-gray-800">
          <span className="font-medium">{address}</span>
          {distanceMeters !== undefined && (
            <span className="ml-2 text-xs text-gray-500 font-normal">
              · {formatDistance(distanceMeters)}
            </span>
          )}
        </div>
      </div>

      {onChange && (
        <button
          type="button"
          onClick={onChange}
          className="flex-shrink-0 text-sm font-semibold text-primary hover:text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
        >
          Đổi
        </button>
      )}
    </div>
  );
};
