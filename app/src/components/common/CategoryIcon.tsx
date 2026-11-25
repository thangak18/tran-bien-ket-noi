import React from 'react';
import { Category } from '@/domain/types';

export interface CategoryIconProps {
  category?: Category;
  className?: string;
}

/**
 * Bộ SVG thô dùng chung 100% giữa React component `<CategoryIcon />`
 * và HTML `L.divIcon` của bản đồ Leaflet (`MapView.tsx`).
 * Đảm bảo icon Đèn đường, Ngập nước (2 giọt nước), Rác thải, Mặt đường
 * hiển thị giống hệt nhau ở mọi nơi (Map pin, Chú giải, Bộ lọc, Thẻ phân loại, Cán bộ).
 */
export const CATEGORY_SVG_PATHS: Record<Category, string> = {
  den_duong: `<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>`,
  ngap_nuoc: `<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>`,
  rac_thai: `<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`,
  mat_duong: `<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>`,
};

const FALLBACK_SVG_PATH = `<line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/>`;

/**
 * Sinh chuỗi `<svg>...</svg>` cho Leaflet `L.divIcon` từ cùng một nguồn `CATEGORY_SVG_PATHS`.
 */
export function renderCategorySvgHtml(category: Category, size: number = 18): string {
  const inner = CATEGORY_SVG_PATHS[category] || CATEGORY_SVG_PATHS.mat_duong;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'h-5 w-5' }) => {
  const inner = category ? CATEGORY_SVG_PATHS[category] : FALLBACK_SVG_PATH;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
};
