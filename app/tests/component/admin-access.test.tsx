import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../src/components/auth/ProtectedRoute';
import { ForbiddenScreen } from '../../src/screens/auth/ForbiddenScreen';
import { AdminLayout } from '../../src/layouts/AdminLayout';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('ADMIN UI access', () => {
  it('local mode explains that the admin portal requires API mode', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'local');
    render(
      <MemoryRouter initialEntries={['/quan-tri']}>
        <AdminLayout />
      </MemoryRouter>
    );
    expect(screen.getByText('Cần chế độ API')).toBeInTheDocument();
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
});
