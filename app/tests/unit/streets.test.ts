import { describe, it, expect } from 'vitest';
import { STREETS, nearestStreet } from '@/data/streets';

describe('UT-018 – Streets (spec 5.3, AC-C03-5)', () => {
  it('1. >= 10 đường, mỗi đường có tên và tọa độ trong khung spec 5.3', () => {
    expect(STREETS.length).toBeGreaterThanOrEqual(10);
    for (const street of STREETS) {
      expect(street.name).toBeTruthy();
      expect(street.lat).toBeGreaterThanOrEqual(10.925);
      expect(street.lat).toBeLessThanOrEqual(10.975);
      expect(street.lng).toBeGreaterThanOrEqual(106.79);
      expect(street.lng).toBeLessThanOrEqual(106.86);
    }
  });

  it('2. nearestStreet tại tọa độ của đường X trả về X', () => {
    const target = STREETS[2];
    expect(target).toBeDefined();
    if (target) {
      const nearest = nearestStreet(target.lat, target.lng);
      expect(nearest.name).toBe(target.name);
    }
  });
});
