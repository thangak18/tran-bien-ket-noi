import type { FontScale, Settings } from '@/domain/types';

export interface FontScaleOption {
  id: FontScale;
  label: string;
  previewPx: number;
  hint: string;
}

export const FONT_SCALE_OPTIONS: FontScaleOption[] = [
  { id: 'small', label: 'Nhỏ', previewPx: 13, hint: 'Gọn, nhiều nội dung' },
  { id: 'normal', label: 'Thường', previewPx: 15, hint: 'Mặc định cân đối' },
  { id: 'large', label: 'Lớn', previewPx: 18, hint: 'Dễ đọc hơn' },
  { id: 'xlarge', label: 'Siêu lớn', previewPx: 21, hint: 'Rõ nét tối đa' },
];

export function resolveFontScale(settings: Pick<Settings, 'fontScale' | 'seniorMode'>): FontScale {
  if (settings.fontScale) return settings.fontScale;
  return settings.seniorMode ? 'large' : 'normal';
}

export function applyFontScale(scale: FontScale): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-font-scale', scale);
  if (scale === 'large' || scale === 'xlarge') {
    root.classList.add('senior');
  } else {
    root.classList.remove('senior');
  }
}

/**
 * Áp dụng chế độ chữ lớn (senior mode) vào phần tử html
 */
export function applySeniorMode(enabled: boolean): void {
  applyFontScale(enabled ? 'large' : 'normal');
}
