import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  apiFetch,
  CITIZEN_LOGIN_REQUIRED_EVENT,
  clearCitizenSession,
  clearStaffSession,
  getAuthToken,
  SESSION_CHANGED_EVENT,
  UNAUTHORIZED_EVENT,
} from '../../src/lib/api';
import { AppStoreProvider, getInitialState, useAppStore } from '../../src/store/AppStore';
import { AuthEvents } from '../../src/components/auth/AuthEvents';

const STAFF_KEYS = ['tb_staff_token', 'tbkn_auth_token', 'tbkn_user_role', 'tbkn_user_name'];

function holdBothSessions() {
  localStorage.setItem('tb_citizen_token', 'citizen-jwt');
  localStorage.setItem('tbkn_user_phone', '0909000068');
  localStorage.setItem('tb_staff_token', 'staff-jwt');
  localStorage.setItem('tbkn_auth_token', 'staff-jwt');
  localStorage.setItem('tbkn_user_role', 'can_bo');
  localStorage.setItem('tbkn_user_name', 'Nguyễn Văn Minh');
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('SESSION-001 – phiên nhân viên và phiên người dân độc lập (AC-SESSION-1)', () => {
  it('clearStaffSession chỉ xoá khoá nhân viên, giữ token người dân', () => {
    holdBothSessions();
    clearStaffSession();
    for (const key of STAFF_KEYS) expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem('tb_citizen_token')).toBe('citizen-jwt');
    expect(localStorage.getItem('tbkn_user_phone')).toBe('0909000068');
  });

  it('clearCitizenSession chỉ xoá khoá người dân, giữ phiên nhân viên', () => {
    holdBothSessions();
    clearCitizenSession();
    expect(localStorage.getItem('tb_citizen_token')).toBeNull();
    expect(localStorage.getItem('tbkn_user_phone')).toBeNull();
    expect(localStorage.getItem('tb_staff_token')).toBe('staff-jwt');
    expect(localStorage.getItem('tbkn_user_role')).toBe('can_bo');
  });

  it('cả hai hàm đều báo store tải lại dữ liệu', () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_CHANGED_EVENT, listener);
    clearStaffSession();
    clearCitizenSession();
    window.removeEventListener(SESSION_CHANGED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('SESSION-002 – settings.phone không đứng một mình ở chế độ API (AC-SESSION-2)', () => {
  function wrapperWithPhone(phone?: string) {
    const initial = getInitialState();
    initial.settings = { ...initial.settings, phone };
    return ({ children }: { children: ReactNode }) =>
      createElement(AppStoreProvider, { initialState: initial, children });
  }

  it('còn settings.phone nhưng không có token người dân → store xoá SĐT khi tải trang', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    const { result } = renderHook(() => useAppStore(), { wrapper: wrapperWithPhone('0909000068') });
    expect(result.current.state.settings.phone).toBeUndefined();
  });

  it('token người dân bị xoá trong lúc dùng → store xoá SĐT khi phiên đổi', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    localStorage.setItem('tb_citizen_token', 'citizen-jwt');
    const { result } = renderHook(() => useAppStore(), { wrapper: wrapperWithPhone('0909000068') });
    expect(result.current.state.settings.phone).toBe('0909000068');
    act(() => clearCitizenSession());
    expect(result.current.state.settings.phone).toBeUndefined();
  });

  it('đăng nhập người dân ở /dang-nhap (có token và tbkn_user_phone) → store nhận SĐT', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    const { result } = renderHook(() => useAppStore(), { wrapper: wrapperWithPhone(undefined) });
    act(() => {
      localStorage.setItem('tb_citizen_token', 'citizen-jwt');
      localStorage.setItem('tbkn_user_phone', '0909000068');
      window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
    });
    expect(result.current.state.settings.phone).toBe('0909000068');
  });

  it('chế độ local giữ nguyên settings.phone (đăng nhập mô phỏng không có token)', () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'local');
    const { result } = renderHook(() => useAppStore(), { wrapper: wrapperWithPhone('0909000068') });
    expect(result.current.state.settings.phone).toBe('0909000068');
  });
});

describe('SESSION-003 – 401 chỉ xoá phiên của API bị từ chối (AC-SESSION-3)', () => {
  it('401 ở /citizen/* → mất token người dân, giữ token nhân viên, phát sự kiện đăng nhập người dân', async () => {
    holdBothSessions();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Hết hạn' } })
    );
    const citizenLogin = vi.fn();
    const staffLogin = vi.fn();
    window.addEventListener(CITIZEN_LOGIN_REQUIRED_EVENT, citizenLogin);
    window.addEventListener(UNAUTHORIZED_EVENT, staffLogin);
    await expect(apiFetch('/citizen/reports', { method: 'POST', body: '{}' })).rejects.toThrow();
    window.removeEventListener(CITIZEN_LOGIN_REQUIRED_EVENT, citizenLogin);
    window.removeEventListener(UNAUTHORIZED_EVENT, staffLogin);
    expect(localStorage.getItem('tb_citizen_token')).toBeNull();
    expect(localStorage.getItem('tb_staff_token')).toBe('staff-jwt');
    expect(localStorage.getItem('tbkn_user_role')).toBe('can_bo');
    expect(citizenLogin).toHaveBeenCalledTimes(1);
    expect(staffLogin).not.toHaveBeenCalled();
  });

  it('401 ở /officer/* → mất phiên nhân viên, giữ token người dân', async () => {
    holdBothSessions();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, { error: { code: 'INVALID_TOKEN', message: 'Hết hạn' } })
    );
    const staffLogin = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, staffLogin);
    await expect(apiFetch('/officer/reports')).rejects.toThrow();
    window.removeEventListener(UNAUTHORIZED_EVENT, staffLogin);
    expect(localStorage.getItem('tb_staff_token')).toBeNull();
    expect(localStorage.getItem('tb_citizen_token')).toBe('citizen-jwt');
    expect(staffLogin).toHaveBeenCalledTimes(1);
  });

  it('401 ở API người dân khi chưa gửi token (khách xem hồ sơ) → không phát sự kiện', async () => {
    localStorage.setItem('tb_staff_token', 'staff-jwt');
    localStorage.setItem('tbkn_user_role', 'can_bo');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, { error: { code: 'CITIZEN_LOGIN_REQUIRED', message: 'Cần đăng nhập' } })
    );
    const citizenLogin = vi.fn();
    window.addEventListener(CITIZEN_LOGIN_REQUIRED_EVENT, citizenLogin);
    await expect(apiFetch('/citizen/reports/HS-1/owner')).rejects.toThrow();
    window.removeEventListener(CITIZEN_LOGIN_REQUIRED_EVENT, citizenLogin);
    expect(citizenLogin).not.toHaveBeenCalled();
    expect(localStorage.getItem('tb_staff_token')).toBe('staff-jwt');
  });

  it('AuthEvents chuyển người dân về /ho-so?login=1&redirect=<trang hiện tại>', () => {
    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/gui/xac-nhan'] },
        createElement(AuthEvents),
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/gui/xac-nhan', element: createElement('p', null, 'C04') }),
          createElement(Route, {
            path: '/ho-so',
            element: createElement(LocationProbe),
          })
        )
      )
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(CITIZEN_LOGIN_REQUIRED_EVENT));
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('login=1&redirect=%2Fgui%2Fxac-nhan');
  });
});

function LocationProbe() {
  const location = useLocation();
  return createElement('p', { 'data-testid': 'probe' }, location.search);
}

describe('SESSION-004 – chọn token theo đường dẫn API (AC-SESSION-4)', () => {
  it('giữ cả hai token: /citizen/* gửi token người dân, /officer/* gửi token nhân viên', async () => {
    holdBothSessions();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(200, { items: [] }));
    await apiFetch('/citizen/me/reports');
    await apiFetch('/officer/reports');
    await apiFetch('/api/v1/volunteer/tasks');
    await apiFetch('/admin/overview');
    const auth = fetchMock.mock.calls.map(([, init]) =>
      new Headers((init as RequestInit).headers).get('Authorization')
    );
    expect(auth).toEqual([
      'Bearer citizen-jwt',
      'Bearer staff-jwt',
      'Bearer staff-jwt',
      'Bearer staff-jwt',
    ]);
  });

  it('getAuthToken không lấy token nhân viên cho API người dân', () => {
    localStorage.setItem('tb_staff_token', 'staff-jwt');
    expect(getAuthToken('/citizen/reports')).toBeNull();
    expect(getAuthToken('/officer/reports')).toBe('staff-jwt');
  });
});
