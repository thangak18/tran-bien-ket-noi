import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { C01Home } from '@/screens/citizen/C01Home';
import { AppStoreProvider } from '@/store/AppStore';
import { AppState } from '@/store/AppStore';
import mockData from '@/data/mock.json';
import { Report } from '@/domain/types';

describe('CT-040 – C01 Trang Phản ánh theo thiết kế mới (Redesign)', () => {
  const baseReports = mockData.reports as Report[];

  it('render tiêu đề Phản ánh và các nút chuyển tab Cộng đồng / Cá nhân', () => {
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

    // Tiêu đề trang
    expect(screen.getByRole('heading', { name: 'Phản ánh' })).toBeInTheDocument();

    // Tab Cộng đồng và Cá nhân
    expect(screen.getAllByRole('button', { name: /Cộng đồng/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Cá nhân/i })[0]).toBeInTheDocument();
  });

  it('hiển thị danh sách các thẻ phản ánh ReportCard', () => {
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

    // Kiểm tra có các mã phản ánh hiển thị trong thẻ
    expect(screen.getByText(baseReports[0]!.id)).toBeInTheDocument();
  });

  it('chuyển tab Cá nhân hiển thị phản ánh của máy hoặc thông báo trống', () => {
    const myReport = baseReports[0]!;
    const initialState: AppState = {
      reports: baseReports,
      volunteerTasks: [],
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [{ id: myReport.id, secretCode: '1234' }],
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

    const personalTabs = screen.getAllByRole('button', { name: /Cá nhân/i });
    fireEvent.click(personalTabs[0]!);

    expect(screen.getByText(myReport.id)).toBeInTheDocument();
  });
});
