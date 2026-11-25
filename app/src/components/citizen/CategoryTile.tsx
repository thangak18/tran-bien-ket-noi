import React from 'react';
import { Category } from '@/domain/types';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Check } from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';

export interface CategoryTileProps {
  category: Category;
  selected?: boolean;
  onSelect?: (category: Category) => void;
  disabled?: boolean;
  className?: string;
}

const CATEGORY_ACTIVE_COLORS: Record<Category, string> = {
  den_duong: 'text-[#F59E0B]',
  ngap_nuoc: 'text-[#3B82F6]',
  rac_thai: 'text-[#10B981]',
  mat_duong: 'text-[#F97316]',
};

export const CategoryTile: React.FC<CategoryTileProps> = ({
  category,
  selected = false,
  onSelect,
  disabled = false,
  className = '',
}) => {
  const config = CATEGORY_CONFIGS.find((c) => c.key === category) || CATEGORY_CONFIGS[0]!;
  const activeColor = CATEGORY_ACTIVE_COLORS[category];

  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect?.(category)}
      className={`relative flex min-h-[104px] min-w-[96px] flex-col items-center justify-center rounded-2xl p-3.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? 'border-2 border-[#0084E8] bg-[#F0F9FF]/70 shadow-sm dark:border-[#38BDF8] dark:bg-sky-950/30'
          : 'border border-slate-200 bg-white shadow-2xs hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
    >
      {/* Checkmark icon at top right */}
      {selected && (
        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0084E8] text-white shadow-xs dark:bg-[#38BDF8] dark:text-slate-950">
          <Check className="check-icon h-3 w-3 stroke-[3]" />
        </span>
      )}

      <div className="mb-1.5 flex h-9 w-9 items-center justify-center">
        <CategoryIcon
          category={category}
          className={`h-8 w-8 transition-colors ${selected ? activeColor : 'text-[#94A3B8]'}`}
        />
      </div>

      <div
        className={`text-sm font-bold leading-tight ${
          selected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {config.label}
      </div>

      <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        Xử lý trong {config.defaultDays} ngày
      </div>
    </button>
  );
};
