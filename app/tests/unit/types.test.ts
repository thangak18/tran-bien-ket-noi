import { describe, it, expect } from 'vitest';
import { CATEGORIES, STATUSES } from '@/domain/types';

describe('UT-010 – Types', () => {
  it('enum Category có đúng 4 giá trị', () => {
    expect(CATEGORIES).toHaveLength(4);
    expect(CATEGORIES).toEqual(['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong']);
  });

  it('enum Status có đúng 11 giá trị', () => {
    expect(STATUSES).toHaveLength(11);
    expect(STATUSES).toEqual([
      'moi',
      'da_tiep_nhan',
      'cho_xac_minh',
      'da_giao',
      'hoan_thanh',
      'dong',
      'mo_lai',
      'can_bo_sung',
      'da_gop',
      'chuyen_co_quan',
      'khong_xac_nhan',
    ]);
  });
});
