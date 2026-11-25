import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStoreProvider, getInitialState } from '@/store/AppStore';
import { C07Nearby } from '@/screens/citizen/C07Nearby';
import { C08Transparency } from '@/screens/citizen/C08Transparency';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function renderWithStore(ui: React.ReactElement) {
  const initialState = getInitialState();
  return render(
    <MemoryRouter>
      <AppStoreProvider initialState={initialState}>{ui}</AppStoreProvider>
    </MemoryRouter>
  );
}

describe('C07Nearby – Bản đồ quanh tôi', () => {
  it('hiển thị bản đồ, nút Toàn phường, chip lọc và carousel tóm tắt', () => {
    renderWithStore(<C07Nearby />);

    expect(screen.getByTestId('screen-title')).toHaveTextContent('Bản đồ quanh tôi');
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /5 km|1 km|Toàn phường/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đèn đường' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đang xử lý' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đã xử lý' })).toBeInTheDocument();
    expect(screen.getAllByText(/người cùng báo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Xem chi tiết/i }).length).toBeGreaterThan(0);
  });

  it('loại bỏ hồ sơ da_gop và không hiển thị số điện thoại', () => {
    const initialState = getInitialState();
    const mergedReport = initialState.reports.find((r) => r.status === 'da_gop');
    render(
      <MemoryRouter>
        <AppStoreProvider initialState={initialState}>
          <C07Nearby />
        </AppStoreProvider>
      </MemoryRouter>
    );

    if (mergedReport) {
      expect(screen.queryByText(mergedReport.id)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/0909/)).not.toBeInTheDocument();
  });

  it('mở rộng phạm vi Toàn phường, mở Bảng chú giải bản đồ và lọc theo chip', () => {
    renderWithStore(<C07Nearby />);

    fireEvent.click(screen.getByRole('button', { name: /5 km|1 km/i }));
    expect(screen.getByRole('button', { name: /Toàn phường/i })).toBeInTheDocument();

    // Không còn nút chuyển Danh sách, thay vào đó bấm nút Chú giải mở Bảng chú giải bản đồ
    expect(screen.queryByRole('button', { name: 'Danh sách' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Chú giải/i }));
    expect(screen.getByText('Bảng chú giải bản đồ')).toBeInTheDocument();
    expect(screen.getByText('Loại sự cố')).toBeInTheDocument();
    expect(screen.getByText('Màu sắc trạng thái')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đã xử lý' }));
    expect(screen.queryByText('Chờ tiếp nhận')).toBeInTheDocument();
  });
});

describe('C08Transparency – Bảng thống kê phường', () => {
  it('hiển thị đúng 4 thẻ KPI tính từ computeKpi', () => {
    renderWithStore(<C08Transparency />);

    expect(screen.getByTestId('screen-title')).toHaveTextContent('Bảng thống kê phường');
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText(/47/)).toBeInTheDocument();
    expect(screen.getByText(/\(73,4%\)/)).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('3,2 ngày')).toBeInTheDocument();
  });

  it('hiển thị 6 thẻ Vừa xử lý xong và chú thích nguồn', () => {
    renderWithStore(<C08Transparency />);

    expect(screen.getByText('Vừa xử lý xong')).toBeInTheDocument();
    expect(screen.getAllByText('Trước')).toHaveLength(6);
    expect(screen.getByText('Số liệu tháng 11/2026 · Dữ liệu mẫu cuộc thi')).toBeInTheDocument();
    expect(screen.queryByText(/0909/)).not.toBeInTheDocument();
  });
});
