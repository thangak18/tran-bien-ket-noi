import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStoreProvider, AppState } from '@/store/AppStore';
import { C04Confirm } from '@/screens/citizen/C04Confirm';
import mockData from '@/data/mock.json';
import { Report } from '@/domain/types';
import * as useDataSourceModule from '@/data/useDataSource';
import { DataSource } from '@/data/DataSource';

const reports = mockData.reports as Report[];

function createTestState(photo = '/demo-photos/den_duong/1.jpg'): AppState {
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
    draft: {
      photos: [photo],
      lat: 10.95,
      lng: 106.82,
      address: 'Đường CMT8, Phường Trấn Biên',
    },
  };
}

describe('AI-FE: C04Confirm AI Suggestion Component Tests', () => {
  it('1. Hiển thị thông báo quyền riêng tư DeepSeek dưới ảnh', () => {
    render(
      <AppStoreProvider initialState={createTestState()}>
        <MemoryRouter>
          <C04Confirm />
        </MemoryRouter>
      </AppStoreProvider>
    );

    const privacyNotices = screen.getAllByText(
      /Ảnh được gửi tới dịch vụ AI \(DeepSeek\) để gợi ý loại sự cố/
    );
    expect(privacyNotices.length).toBeGreaterThan(0);
  });

  it('2. Hiển thị băng AI gợi ý khi phân tích thành công và không chứa số cứng 94%', async () => {
    const mockDs: Partial<DataSource> = {
      suggestCategory: vi.fn().mockResolvedValue({
        category: 'den_duong',
        confidence: 0.91,
        provider: 'deepseek',
        reason: 'Phát hiện cột đèn chiếu sáng bị nghiêng',
      }),
    };
    vi.spyOn(useDataSourceModule, 'useDataSource').mockReturnValue(mockDs as DataSource);

    render(
      <AppStoreProvider initialState={createTestState()}>
        <MemoryRouter>
          <C04Confirm />
        </MemoryRouter>
      </AppStoreProvider>
    );

    await waitFor(() => {
      const banners = screen.getAllByTestId('ai-suggestion-banner');
      expect(banners.length).toBeGreaterThan(0);
    });

    // Xác nhận nhãn AI thật
    expect(screen.getAllByText(/Gợi ý bởi AI – vui lòng kiểm tra lại/).length).toBeGreaterThan(0);
    // Xác nhận nội dung gợi ý
    expect(screen.getAllByText(/Phát hiện cột đèn chiếu sáng bị nghiêng/).length).toBeGreaterThan(
      0
    );
    // Tuyệt đối không chứa số cứng (94%)
    expect(screen.queryByText(/94%/)).toBeNull();
  });

  it('3. Nhấn "Dùng gợi ý" cập nhật loại sự cố sang loại gợi ý', async () => {
    const mockDs: Partial<DataSource> = {
      suggestCategory: vi.fn().mockResolvedValue({
        category: 'den_duong',
        confidence: 0.91,
        provider: 'mock',
        reason: 'Đèn đường',
      }),
    };
    vi.spyOn(useDataSourceModule, 'useDataSource').mockReturnValue(mockDs as DataSource);

    render(
      <AppStoreProvider initialState={createTestState()}>
        <MemoryRouter>
          <C04Confirm />
        </MemoryRouter>
      </AppStoreProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dùng gợi ý').length).toBeGreaterThan(0);
    });

    const useButtons = screen.getAllByText('Dùng gợi ý');
    fireEvent.click(useButtons[0]!);

    // Sau khi nhấn, nút chuyển thành trạng thái "Đang chọn"
    await waitFor(() => {
      expect(screen.getAllByText(/Đang chọn/).length).toBeGreaterThan(0);
    });
  });

  it('4. Hiển thị thông báo nhẹ nhàng khi AI không nhận ra loại sự cố (< 0.5)', async () => {
    const mockDs: Partial<DataSource> = {
      suggestCategory: vi.fn().mockResolvedValue({
        category: null,
        confidence: 0.2,
        provider: 'deepseek',
        reason: 'Hình ảnh không rõ ràng',
      }),
    };
    vi.spyOn(useDataSourceModule, 'useDataSource').mockReturnValue(mockDs as DataSource);

    render(
      <AppStoreProvider initialState={createTestState()}>
        <MemoryRouter>
          <C04Confirm />
        </MemoryRouter>
      </AppStoreProvider>
    );

    await waitFor(() => {
      const unrec = screen.getAllByTestId('ai-suggestion-unrecognized');
      expect(unrec.length).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByText(/Không nhận ra loại sự cố, bạn chọn giúp nhé/).length
    ).toBeGreaterThan(0);
  });
});
