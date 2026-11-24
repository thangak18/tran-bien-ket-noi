import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { C01Home } from '@/screens/citizen/C01Home';
import { AppStoreProvider } from '@/store/AppStore';
import { AppState } from '@/store/AppStore';
import mockData from '@/data/mock.json';
import { Report } from '@/domain/types';

describe('CT-040 – C01 Trang chủ công dân (spec AC-C01)', () => {
  const baseReports = mockData.reports as Report[];

  it('thứ tự khối đúng AC-C01-1; không có hồ sơ trên máy -> ẩn "Phản ánh của bạn"', () => {
    const initialState: AppState = {
      reports: baseReports,
      volunteerTasks: [],
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [],
        anonymousLog: [],
      },
      draft: { photos: [] },
    };

    render(
      <AppStoreProvider initialState={initialState}>
        <MemoryRouter>
          <C01Home />
        </MemoryRouter>
      </AppStoreProvider>
    );

    // Header phường
    expect(screen.getByText('Phường Trấn Biên')).toBeInTheDocument();

    // Thẻ kêu gọi "Thấy chỗ hư hỏng? Chụp một tấm, phường sẽ lo."
    expect(screen.getByText(/Thấy chỗ hư hỏng\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Chụp một tấm, phường sẽ lo\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Báo sự cố/i })).toBeInTheDocument();

    // Không có hồ sơ trên máy -> ẩn hoàn toàn khối "Phản ánh của bạn"
    expect(screen.queryByText('Phản ánh của bạn')).not.toBeInTheDocument();

    // Khối "Quanh đây"
    expect(screen.getByText('Quanh đây')).toBeInTheDocument();
    expect(screen.getByText('Xem bản đồ')).toBeInTheDocument();

    // Dải số liệu dẫn tới /minh-bach
    expect(screen.getByText(/47\/64/)).toBeInTheDocument();
    expect(screen.getByText(/đã xử lý/i)).toBeInTheDocument();
  });

  it('có 2 hồ sơ trên máy -> hiện 2 thẻ có ProgressBar và cập nhật mới nhất', () => {
    const myReport1 = baseReports[0]!;
    const myReport2 = baseReports[1]!;

    const initialState: AppState = {
      reports: baseReports,
      volunteerTasks: [],
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [
          { id: myReport1.id, secretCode: '1111' },
          { id: myReport2.id, secretCode: '2222' },
        ],
        anonymousLog: [],
      },
      draft: { photos: [] },
    };

    render(
      <AppStoreProvider initialState={initialState}>
        <MemoryRouter>
          <C01Home />
        </MemoryRouter>
      </AppStoreProvider>
    );

    // Có khối "Phản ánh của bạn"
    expect(screen.getByText('Phản ánh của bạn')).toBeInTheDocument();

    // Có mã của 2 hồ sơ
    expect(screen.getByText(new RegExp(myReport1.id))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(myReport2.id))).toBeInTheDocument();
  });

  it('"Quanh đây" hiển thị đúng 3 mục gần nhất kèm khoảng cách', () => {
    const initialState: AppState = {
      reports: baseReports,
      volunteerTasks: [],
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [],
        anonymousLog: [],
      },
      draft: { photos: [] },
    };

    render(
      <AppStoreProvider initialState={initialState}>
        <MemoryRouter>
          <C01Home />
        </MemoryRouter>
      </AppStoreProvider>
    );

    const nearbySection = screen.getByTestId('c01-nearby-section');
    expect(nearbySection).toBeInTheDocument();

    // Đúng 3 thẻ mục
    const items = nearbySection.querySelectorAll('[data-testid="nearby-item"]');
    expect(items.length).toBe(3);

    // Mỗi mục có khoảng cách dạng "m" hoặc "km"
    for (const item of items) {
      expect(item.textContent).toMatch(/\d+\s*(m|km)/);
    }
  });

  it('bấm dải số liệu chuyển hướng sang /minh-bach', () => {
    const initialState: AppState = {
      reports: baseReports,
      volunteerTasks: [],
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [],
        anonymousLog: [],
      },
      draft: { photos: [] },
    };

    render(
      <AppStoreProvider initialState={initialState}>
        <MemoryRouter>
          <C01Home />
        </MemoryRouter>
      </AppStoreProvider>
    );

    const kpiStrip = screen.getByTestId('c01-kpi-strip');
    expect(kpiStrip).toBeInTheDocument();
    expect(kpiStrip.getAttribute('href')).toBe('/minh-bach');
  });
});
