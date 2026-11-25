import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStoreProvider, getInitialState } from '@/store/AppStore';
import { C09Notifications } from '@/screens/citizen/C09Notifications';

const PHONE = '0909000068';

function stateWithUnread() {
  const s = getInitialState();
  s.settings = { ...s.settings, phone: PHONE };
  s.notifications = [
    {
      id: 'n-1',
      phone: PHONE,
      reportId: 'TB-0007',
      message: 'Phản ánh #TB-0007 đã được xử lý xong.',
      createdAt: '2026-11-24T08:00:00+07:00',
      read: false,
      channel: 'app',
    },
  ];
  return s;
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('C09-READ-001 – "Đánh dấu đã đọc" lưu ở máy chủ (AC-C09-1)', () => {
  it('chế độ API: gọi POST /citizen/me/notifications/read bằng token người dân', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    localStorage.setItem('tb_citizen_token', 'citizen-jwt');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: true, items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    render(
      <AppStoreProvider initialState={stateWithUnread()}>
        <MemoryRouter initialEntries={['/thong-bao']}>
          <C09Notifications />
        </MemoryRouter>
      </AppStoreProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Đánh dấu đã đọc/ }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/citizen/me/notifications/read')
      );
      expect(call).toBeDefined();
      const init = call![1] as RequestInit;
      expect(init.method).toBe('POST');
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer citizen-jwt');
    });
  });
});
