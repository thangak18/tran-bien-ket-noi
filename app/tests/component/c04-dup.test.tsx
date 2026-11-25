import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppStoreProvider, AppState, useAppStore } from '@/store/AppStore';
import { C04Confirm } from '@/screens/citizen/C04Confirm';
import mockData from '@/data/mock.json';
import { Report, Category } from '@/domain/types';

const reports = mockData.reports as Report[];

function mk(category: Category, lat: number, lng: number): AppState {
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
    draft: { photos: ['/demo-photos/placeholder.jpg'], category, lat, lng, address: 'Test' },
  };
}

/** Màn Xác nhận gửi dạng 3 bước: bước 1 chọn loại, bước 2 chọn vị trí rồi "Xác nhận vị trí" mới kiểm tra trùng. */
function renderAndConfirmLocation(s: AppState) {
  render(
    <AppStoreProvider initialState={s}>
      <MemoryRouter>
        <C04Confirm />
      </MemoryRouter>
    </AppStoreProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /Tiếp tục chọn vị trí/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vị trí' }));
}

describe('Cảnh báo trùng trên màn Xác nhận gửi', () => {
  for (const id of ['TB-0009', 'TB-0010', 'TB-0024', 'TB-0025']) {
    it(`hiện hộp thoại đối chiếu khi gửi cùng loại sát ${id}`, () => {
      const t = reports.find((x) => x.id === id)!;
      renderAndConfirmLocation(mk(t.category, t.lat + 0.0001, t.lng));
      expect(
        screen.getByRole('dialog', { name: 'Đối chiếu phản ánh tương tự' })
      ).toBeInTheDocument();
      expect(screen.getByText('Phát hiện phản ánh tương tự')).toBeInTheDocument();
    });
  }

  it('không hiện khi khác loại', () => {
    const t = reports.find((x) => x.id === 'TB-0009')!;
    renderAndConfirmLocation(mk('rac_thai', t.lat + 0.0001, t.lng));
    expect(screen.queryByRole('dialog', { name: 'Đối chiếu phản ánh tương tự' })).toBeNull();
  });

  it('không hiện khi xa > 50m', () => {
    const t = reports.find((x) => x.id === 'TB-0009')!;
    renderAndConfirmLocation(mk(t.category, t.lat + 0.01, t.lng));
    expect(screen.queryByRole('dialog', { name: 'Đối chiếu phản ánh tương tự' })).toBeNull();
  });
});

function DraftProbe() {
  const { state } = useAppStore();
  return <p data-testid="draft-photos">{state.draft.photos.length}</p>;
}

describe('C04-DRAFT-001 – Gửi thành công thì xoá bản nháp (AC-C04-14, spec 13.3a)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('chế độ API, đã đăng nhập: gửi xong về trang chủ với bản nháp trống', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'api');
    localStorage.setItem('tb_citizen_token', 'citizen-jwt');
    const created = reports.find((x) => x.id === 'TB-0001')!;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const body =
        url.endsWith('/citizen/reports') && init?.method === 'POST'
          ? { code: created.id }
          : url.includes(`/public/reports/${created.id}`)
            ? { ...created, code: created.id }
            : { items: [] };
      return new Response(JSON.stringify(body), {
        status: init?.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const t = reports.find((x) => x.id === 'TB-0009')!;
    const s = mk(t.category, t.lat + 0.01, t.lng);
    s.settings = { ...s.settings, phone: '0909000068' };
    render(
      <AppStoreProvider initialState={s}>
        <MemoryRouter initialEntries={['/bao-su-co/xac-nhan']}>
          <Routes>
            <Route path="/bao-su-co/xac-nhan" element={<C04Confirm />} />
            <Route path="/" element={<DraftProbe />} />
          </Routes>
        </MemoryRouter>
      </AppStoreProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục chọn vị trí/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vị trí' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Gửi phản ánh/ })[0]!);
    expect(await screen.findByTestId('draft-photos')).toHaveTextContent('0');
  });
});
