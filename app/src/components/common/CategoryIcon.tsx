import React from 'react';
import { Lightbulb, Droplets, Trash2, Construction, ImageOff } from 'lucide-react';
import { Category } from '@/domain/types';

export interface CategoryIconProps {
  category?: Category;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'h-5 w-5' }) => {
  switch (category) {
    case 'den_duong':
      return <Lightbulb className={className} />;
    case 'ngap_nuoc':
      return <Droplets className={className} />;
    case 'rac_thai':
      return <Trash2 className={className} />;
    case 'mat_duong':
      return <Construction className={className} />;
    default:
      return <ImageOff className={className} />;
  }
};
