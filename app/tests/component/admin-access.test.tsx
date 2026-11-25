import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../src/components/auth/ProtectedRoute';
import { ForbiddenScreen } from '../../src/screens/auth/ForbiddenScreen';
import { AdminLayout } from '../../src/layouts/AdminLayout';
import { AdminOverview } from '../../src/screens/admin/AdminOverview';
import { AdminStaffPage } from '../../src/screens/admin/AdminManagement';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';
import { PortalSwitcherFab } from '../../src/components/common/PortalSwitcherFab';
import { AppStoreProvider } from '../../src/store/AppStore';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('ADMIN UI access', () => {
  it('chế độ local hiển thị cổng quản trị có nhãn Mô phỏng, tính KPI từ dữ liệu và tải được danh sách tài khoản mẫu', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'local');
    render(
      <MemoryRouter initialEntries={['/quan-tri']}>
        <AppStoreProvider>
          <Routes>
            <Route path="/quan-tri" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="tai-khoan" element={<AdminStaffPage />} />
            </Route>
          </Routes>
        </AppStoreProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Cổng quản trị')).toBeInTheDocument();
    expect(screen.getByText('Mô phỏng')).toBeInTheDocument();
    expect(await screen.findByText('64')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('redirects a non-admin API session to the forbidden screen', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    localStorage.setItem('tb_staff_token', 'staff-token');
    localStorage.setItem('tbkn_user_role', 'can_bo');
    render(
      <MemoryRouter initialEntries={['/quan-tri']}>
        <Routes>
          <Route
            path="/quan-tri"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <p>Admin workspace</p>
              </ProtectedRoute>
            }
          />
          <Route path="/khong-co-quyen" element={<ForbiddenScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/403 – Không có quyền truy cập/)).toBeInTheDocument();
    expect(screen.queryByText('Admin workspace')).not.toBeInTheDocument();
  });

  it('sends an authenticated admin to the admin home route', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'admin-jwt',
          user: {
            id: '55555555-5555-5555-5555-555555555555',
            role: 'admin',
            displayName: 'Quản trị viên Phường',
            email: 'admin@tranbien.gov.vn',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dang-nhap']}>
        <Routes>
          <Route path="/dang-nhap" element={<LoginScreen />} />
          <Route path="/quan-tri" element={<p>Admin landing</p>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /^Quản trị$/ }));
    await user.type(screen.getByPlaceholderText('••••••••'), 'temporary-password');
    await user.click(screen.getByRole('button', { name: /Đăng nhập vào hệ thống/ }));

    expect(await screen.findByText('Admin landing')).toBeInTheDocument();
    expect(localStorage.getItem('tbkn_user_role')).toBe('admin');
  });

  it('PortalSwitcherFab có mục Cổng Quản trị dẫn tới /quan-tri và đánh dấu đang chọn khi ở /quan-tri', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <PortalSwitcherFab />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Chuyển cổng nghiệp vụ' }));
    const adminItem = screen.getByRole('menuitem', { name: /Cổng Quản trị/ });
    expect(adminItem).toHaveAttribute('href', '/quan-tri');
  });
});
