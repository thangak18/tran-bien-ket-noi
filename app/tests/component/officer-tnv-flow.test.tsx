import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppStoreProvider, AppState } from '@/store/AppStore';
import { A02Panel } from '@/screens/officer/A02Panel';
import { V01Tasks } from '@/screens/volunteer/V01Tasks';
import { V02Verify } from '@/screens/volunteer/V02Verify';
import mockData from '@/data/mock.json';
import { Report } from '@/domain/types';

describe('Luồng liên vai trò: cán bộ giao TNV -> TNV gửi -> cán bộ xem kết quả', () => {
  it('chạy trọn luồng', async () => {
    const reports = mockData.reports as Report[];
    const target = reports.find((r) => r.status === 'moi') as Report;
    expect(target).toBeTruthy();
    const initial: AppState = {
      reports,
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
    const router = createMemoryRouter(
      [
        {
          element: (
            <AppStoreProvider initialState={initial}>
              <Outlet />
            </AppStoreProvider>
          ),
          children: [
            { path: '/can-bo/:id', element: <A02Panel /> },
            { path: '/tnv', element: <V01Tasks /> },
            { path: '/tnv/:taskId', element: <V02Verify /> },
          ],
        },
      ],
      { initialEntries: [`/can-bo/${target.id}`] }
    );
    render(<RouterProvider router={router} />);

    // Cán bộ giao TNV
    fireEvent.click(screen.getByRole('button', { name: /Giao TNV xác minh/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'Lê Thảo Vy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận giao|Giao nhiệm vụ/i }));

    // TNV thấy nhiệm vụ
    await router.navigate('/tnv');
    expect(await screen.findByText('Xác minh ban đầu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Xác minh ban đầu'));

    // Form: bước 1 chưa đủ -> nút Tiếp tục bị khoá
    const nextToStep2 = await screen.findByRole('button', { name: /Tiếp tục chụp ảnh \/ video/i });
    expect(nextToStep2).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Có' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nguy hiểm' }));
    // Tự động chuyển sang bước 2 -> chọn ảnh mẫu -> tự động chuyển sang bước 3
    fireEvent.click(await screen.findByRole('button', { name: /Dùng ảnh mẫu/i }));
    const send = await screen.findByRole('button', { name: /Gửi kết quả/i });
    expect(send).toBeEnabled();
    fireEvent.click(send);

    // Về V01, nhiệm vụ sang Đã xong
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Đã xong/i })).toBeInTheDocument();
    });

    // Cán bộ thấy kết quả xác minh
    await router.navigate(`/can-bo/${target.id}`);
    await waitFor(() => {
      expect(screen.getAllByText(/Nguy hiểm/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Lê Thảo Vy/i).length).toBeGreaterThan(0);
    });
  });
});
