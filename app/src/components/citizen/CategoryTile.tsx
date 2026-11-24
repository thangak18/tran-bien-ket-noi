import React from 'react';
import { Category } from '@/domain/types';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Lightbulb, Droplets, Trash2, Construction, Check } from 'lucide-react';

export interface CategoryTileProps {
  category: Category;
  selected?: boolean;
  onSelect?: (category: Category) => void;
  disabled?: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  den_duong: <Lightbulb className="h-8 w-8 text-amber-500" />,
  ngap_nuoc: <Droplets className="h-8 w-8 text-blue-500" />,
  rac_thai: <Trash2 className="h-8 w-8 text-emerald-600" />,
  mat_duong: <Construction className="h-8 w-8 text-orange-500" />,
};

export const CategoryTile: React.FC<CategoryTileProps> = ({
  category,
  selected = false,
  onSelect,
  disabled = false,
  className = '',
}) => {
  const config = CATEGORY_CONFIGS.find((c) => c.key === category) || CATEGORY_CONFIGS[0]!;
  const icon = CATEGORY_ICONS[category];

  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect?.(category)}
      className={`relative flex min-h-[96px] min-w-[96px] flex-col items-center justify-center rounded-2xl p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? 'border-2 border-primary bg-primary-50/70 shadow-sm'
          : 'border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 shadow-2xs'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {/* Checkmark icon at top right */}
      {selected && (
        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-xs">
          <Check className="check-icon h-3 w-3 stroke-[3]" />
        </span>
      )}

      <div className="mb-1.5 flex h-10 w-10 items-center justify-center">{icon}</div>

      <div className="text-sm font-semibold text-gray-900 leading-tight">{config.label}</div>
    </button>
  );
};
