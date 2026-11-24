import { describe, it, expect } from 'vitest';
import {
  CATEGORY_CONFIGS,
  DEFAULT_DEADLINES,
  STATUS_CONFIGS,
  DEPARTMENTS,
  VOLUNTEERS,
  DEMO_NOW,
  publicLabel,
} from '@/domain/constants';

describe('UT-011 – Constants', () => {
  it('1. có đúng 4 loại theo thứ tự Đèn đường, Ngập nước, Rác thải, Mặt đường', () => {
    expect(CATEGORY_CONFIGS.map((c) => c.key)).toEqual([
      'den_duong',
      'ngap_nuoc',
      'rac_thai',
      'mat_duong',
    ]);
    expect(CATEGORY_CONFIGS.map((c) => c.label)).toEqual([
      'Đèn đường',
      'Ngập nước',
      'Rác thải',
      'Mặt đường',
    ]);
  });

  it('2. hạn mặc định: den_duong 3, ngap_nuoc 2, rac_thai 2, mat_duong 5', () => {
    expect(DEFAULT_DEADLINES.den_duong).toBe(3);
    expect(DEFAULT_DEADLINES.ngap_nuoc).toBe(2);
    expect(DEFAULT_DEADLINES.rac_thai).toBe(2);
    expect(DEFAULT_DEADLINES.mat_duong).toBe(5);
  });

  it('3. mỗi status có đủ: nhãn CB, nhãn công khai, bước, màu, icon', () => {
    const statuses = Object.keys(STATUS_CONFIGS);
    expect(statuses).toHaveLength(11);
    for (const key of statuses) {
      const config = STATUS_CONFIGS[key as keyof typeof STATUS_CONFIGS];
      expect(config.officerLabel).toBeTruthy();
      expect(config.publicLabel).toBeTruthy();
      expect(config.step).toBeDefined();
      expect(config.color).toBeTruthy();
      expect(config.icon).toBeTruthy();
    }
  });

  it('4. publicLabel("cho_xac_minh") chứa "Đang kiểm tra tại chỗ"', () => {
    expect(publicLabel('cho_xac_minh')).toContain('Đang kiểm tra tại chỗ');
  });

  it('5. có 5 bộ phận và 3 TNV mẫu', () => {
    expect(DEPARTMENTS).toHaveLength(5);
    expect(VOLUNTEERS).toHaveLength(3);
    expect(VOLUNTEERS).toEqual(['Lê Thảo Vy', 'Trần Quốc Bảo', 'Phạm Ngọc Hân']);
    expect(DEMO_NOW).toBe('2026-11-24T09:00:00+07:00');
  });
});
