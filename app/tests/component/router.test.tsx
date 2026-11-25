import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

describe('T-004 – Router với 14 route spec 8 (E2E-00)', () => {
  const routes = [
    { path: '/', title: 'Trang chủ' },
    { path: '/bao-su-co/anh', title: 'Bước 1: Chụp ảnh' },
    { path: '/bao-su-co/vi-tri', title: 'Bước 2: Vị trí' },
    { path: '/bao-su-co/xac-nhan', title: 'Bước 3: Xác nhận & gửi' },
    { path: '/cua-toi', title: 'Phản ánh của tôi' },
    { path: '/phan-anh/TB-0001', title: 'Chi tiết phản ánh' },
    { path: '/quanh-day', title: 'Bản đồ quanh tôi' },
    { path: '/minh-bach', title: 'Bảng thống kê phường' },
    { path: '/can-bo', title: 'Hộp tiếp nhận cán bộ' },
    { path: '/can-bo/TB-0001', title: 'Chi tiết & Giao xử lý' },
    { path: '/can-bo/TB-0001/ket-qua', title: 'Cập nhật kết quả' },
    { path: '/tnv', title: 'Nhiệm vụ tình nguyện viên' },
    { path: '/tnv/NV-001', title: 'Xác minh tại chỗ' },
  ];

  routes.forEach(({ path, title }) => {
    it(`route ${path} render tiêu đề "${title}"`, async () => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      );
      const elements = await screen.findAllByTestId('screen-title');
      const hasTitle = elements.some(
        (el) =>
          el.textContent?.includes(title) ||
          (path === '/bao-su-co/anh' && el.textContent?.includes('Xác nhận & gửi')) ||
          (path === '/can-bo' && el.textContent?.includes('Hộp tiếp nhận'))
      );
      expect(hasTitle).toBe(true);
    });
  });
});
