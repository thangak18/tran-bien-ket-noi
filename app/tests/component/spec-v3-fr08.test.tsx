import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppStoreProvider, AppState } from '@/store/AppStore';
import { C06Detail } from '@/screens/citizen/C06Detail';
import { C04Confirm } from '@/screens/citizen/C04Confirm';
import { C01Home } from '@/screens/citizen/C01Home';
import mockData from '@/data/mock.json';
import { Report } from '@/domain/types';

const reports = mockData.reports as Report[];
// Hồ sơ có SĐT, còn đang xử lý: nút "Tôi cũng gặp" được phép hiện (trừ với người gửi).
const target = reports.find(
  (r) => !r.anonymous && r.reporterPhone && ['da_tiep_nhan', 'da_giao'].includes(r.status)
)!;

function stateWith(phone?: string, draft: AppState['draft'] = { photos: [] }): AppState {
  return {
    reports,
    volunteerTasks: [],
    notifications: [],
    settings: {
      seniorMode: false,
      demoNow: '2026-11-24T09:00:00+07:00',
      deviceReports: [],
      anonymousLog: [],
      ...(phone ? { phone } : {}),
    },
    draft,
  };
}

function renderC06(phone?: string) {
  return render(
    <AppStoreProvider initialState={stateWith(phone)}>
      <MemoryRouter initialEntries={[`/phan-anh/${target.id}`]}>
        <Routes>
          <Route path="/phan-anh/:id" element={<C06Detail />} />
          <Route path="/ho-so" element={<div data-testid="login-page">Đăng nhập</div>} />
        </Routes>
      </MemoryRouter>
    </AppStoreProvider>
  );
}

describe('FOLLOW-003 – "Tôi cũng gặp" theo spec v3.0 (AC-C06-13)', () => {
  it('người gửi (SĐT đăng nhập = người gửi) không thấy nút trên hồ sơ của mình', () => {
    renderC06(target.reporterPhone);
    expect(screen.queryByText('Tôi cũng gặp vấn đề này')).toBeNull();
  });

  it('người dân khác đã đăng nhập thấy nút', () => {
    renderC06('0911222333');
    expect(screen.getAllByText('Tôi cũng gặp vấn đề này').length).toBeGreaterThan(0);
  });

  it('chưa đăng nhập bấm nút → chuyển sang đăng nhập, không ghi nhận', async () => {
    renderC06();
    fireEvent.click(screen.getAllByText('Tôi cũng gặp vấn đề này')[0]!);
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });
});

describe('C04-CAT-001 – Bước 1 không chọn sẵn loại (AC-C04-15)', () => {
  it('chưa chọn loại: không ô nào được chọn, nút tiếp tục tắt và có dòng nhắc; chọn xong thì bật', () => {
    render(
      <AppStoreProvider
        initialState={stateWith('0911222333', {
          photos: ['/demo-photos/rac_thai/1.jpg'],
          lat: 10.95,
          lng: 106.82,
          address: 'Đ. Cách Mạng Tháng Tám, P. Trấn Biên',
        })}
      >
        <MemoryRouter>
          <C04Confirm />
        </MemoryRouter>
      </AppStoreProvider>
    );
    const tiles = screen.getAllByRole('button', { pressed: false });
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    const next = screen.getByRole('button', { name: /Tiếp tục chọn vị trí/ });
    expect(next).toBeDisabled();
    expect(screen.getByTestId('category-required-hint')).toHaveTextContent(
      'Hãy chọn một loại sự cố để tiếp tục'
    );

    fireEvent.click(tiles.find((t) => t.textContent?.includes('Rác thải'))!);
    expect(screen.getByRole('button', { name: /Tiếp tục chọn vị trí/ })).toBeEnabled();
    expect(screen.queryByTestId('category-required-hint')).toBeNull();
  });
});

describe('C01 tab "Của tôi" khi chưa đăng nhập (AC-C01-6, AC-C05-1)', () => {
  it('chưa đăng nhập → mời đăng nhập thay vì "Bạn chưa gửi phản ánh nào"', () => {
    render(
      <AppStoreProvider initialState={stateWith()}>
        <MemoryRouter initialEntries={['/?tab=personal']}>
          <C01Home />
        </MemoryRouter>
      </AppStoreProvider>
    );
    expect(screen.getByTestId('personal-login-invite')).toHaveTextContent(
      'Đăng nhập để xem phản ánh của bạn'
    );
    expect(screen.queryByText('Bạn chưa gửi phản ánh nào')).toBeNull();
  });
});
