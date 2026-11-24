import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStoreProvider, AppState } from '@/store/AppStore';
import { C04Confirm } from '@/screens/citizen/C04Confirm';
import mockData from '@/data/mock.json';
import { Report, Category } from '@/domain/types';

const reports = mockData.reports as Report[];
function mk(category: Category, lat: number, lng: number): AppState {
  return {
    reports,
    volunteerTasks: [],
    notifications: [],
    settings: {
      seniorMode: false,
      demoNow: '2026-11-24T09:00:00+07:00',
      deviceReports: [],
      anonymousLog: [],
    },
    draft: { photos: ['/demo-photos/placeholder.jpg'], category, lat, lng, address: 'Test' },
  };
}
const r = (s: AppState) =>
  render(
    <AppStoreProvider initialState={s}>
      <MemoryRouter>
        <C04Confirm />
      </MemoryRouter>
    </AppStoreProvider>
  );

describe('Cảnh báo trùng trên màn Xác nhận gửi', () => {
  for (const id of ['TB-0041', 'TB-0052', 'TB-0053']) {
    it(`hiện thẻ khi gửi cùng loại sát ${id}`, () => {
      const t = reports.find((x) => x.id === id)!;
      r(mk(t.category, t.lat + 0.0001, t.lng));
      expect(screen.getAllByText(/Có sự cố tương tự gần đây/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Gợi ý mô phỏng/).length).toBeGreaterThan(0);
    });
  }
  it('không hiện khi khác loại', () => {
    const t = reports.find((x) => x.id === 'TB-0041')!;
    r(mk('rac_thai', t.lat + 0.0001, t.lng));
    expect(screen.queryByText(/Có sự cố tương tự gần đây/)).toBeNull();
  });
  it('không hiện khi xa > 50m', () => {
    const t = reports.find((x) => x.id === 'TB-0041')!;
    r(mk(t.category, t.lat + 0.01, t.lng));
    expect(screen.queryByText(/Có sự cố tương tự gần đây/)).toBeNull();
  });
});
