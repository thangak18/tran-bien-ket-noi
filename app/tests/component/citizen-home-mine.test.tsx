import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStoreProvider, getInitialState } from '@/store/AppStore';
import { C01Home } from '@/screens/citizen/C01Home';
import { C05Mine } from '@/screens/citizen/C05Mine';
import { formatRelativeTime } from '@/domain/format';
import { lookupReportByCode } from '@/domain/access';

describe('C01Home & C05Mine', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('formatRelativeTime hiển thị "1 tháng trước" khi quá 30 ngày', () => {
    expect(formatRelativeTime('2026-10-15T09:00:00+07:00', '2026-11-24T09:00:00+07:00')).toBe(
      '1 tháng trước'
    );
    expect(formatRelativeTime('2026-11-22T09:00:00+07:00', '2026-11-24T09:00:00+07:00')).toBe(
      '2 ngày trước'
    );
  });

  it('C01Home hiển thị header Phản ánh, tab Cộng đồng/Cá nhân (3 pill lọc) và tìm kiếm trực tiếp', () => {
    const initial = getInitialState();
    render(
      <MemoryRouter>
        <AppStoreProvider initialState={initial}>
          <C01Home />
        </AppStoreProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Phản ánh' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cộng đồng' })).toHaveAttribute('aria-selected', 'true');

    // Phân trang 10 hàng trên mỗi trang (mặc định 1 cột trên mobile = 10 phản ánh/trang)
    const grid = screen.getByTestId('community-report-grid');
    expect(grid.children.length).toBe(10);
    expect(screen.getByTestId('report-pagination')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }));
    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');

    // Chuyển sang tab Cá nhân -> hiển thị 3 nút lọc chia đều
    fireEvent.click(screen.getByRole('tab', { name: 'Cá nhân' }));
    expect(screen.getByRole('tab', { name: /Tất cả/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Đang xử lý/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Đã xử lý/ })).toBeInTheDocument();

    // Quay về tab Cộng đồng và mở tìm kiếm trực tiếp
    fireEvent.click(screen.getByRole('tab', { name: 'Cộng đồng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm phản ánh' }));
    const searchInput = screen.getByPlaceholderText(/Tìm mã TB-xxxx/);
    fireEvent.change(searchInput, { target: { value: 'KHONG_TON_TAI_XYZ' } });
    expect(screen.getByText('Không tìm thấy phản ánh nào')).toBeInTheDocument();
  });

  it('C05Mine (Hồ sơ) hiển thị Bảng thống kê phường, đăng nhập SĐT, tra cứu mã và chuyển chế độ Aa Chữ lớn + Sáng/Tối', () => {
    const initial = getInitialState();
    const firstReport = initial.reports[0]!;

    render(
      <MemoryRouter>
        <AppStoreProvider initialState={initial}>
          <C05Mine />
        </AppStoreProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Hồ sơ' })).toBeInTheDocument();
    expect(screen.getByText(/Bảng thống kê phường/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();

    // Chọn kích cỡ chữ (Nhỏ, Thường, Lớn, Siêu lớn)
    const largeBtn = screen.getAllByRole('radio', { name: 'Lớn' })[0]!;
    fireEvent.click(largeBtn);
    expect(document.documentElement.classList.contains('senior')).toBe(true);
    expect(document.documentElement.getAttribute('data-font-scale')).toBe('large');

    // Chuyển giao diện tối
    const themeSwitch = screen.getByRole('switch', { name: /Chuyển giao diện sáng tối/ });
    fireEvent.click(themeSwitch);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    expect(lookupReportByCode(initial.reports, firstReport.id, firstReport.secretCode)?.id).toBe(
      firstReport.id
    );
  });
});
