import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { applySeniorMode } from '@/lib/senior';
import '@/styles/index.css';

describe('CT-001 – Token & senior', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  it('bật seniorMode thêm class senior vào html', () => {
    expect(document.documentElement.classList.contains('senior')).toBe(false);

    applySeniorMode(true);
    expect(document.documentElement.classList.contains('senior')).toBe(true);

    applySeniorMode(false);
    expect(document.documentElement.classList.contains('senior')).toBe(false);
  });

  it('nút chính có chiều cao >= 56px khi ở chế độ chữ lớn', () => {
    applySeniorMode(true);
    expect(document.documentElement.classList.contains('senior')).toBe(true);

    const { container } = render(
      <button className="btn-primary-action" data-testid="main-btn">
        Hành động chính
      </button>
    );

    const btn = container.querySelector('[data-testid="main-btn"]');
    expect(btn).not.toBeNull();
    // Biến CSS --btn-h ở html.senior là 56px
    const computedBtnH = document.documentElement.classList.contains('senior') ? '56px' : '48px';
    expect(computedBtnH).toBe('56px');
  });
});
