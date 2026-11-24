import { describe, it, expect, beforeEach } from 'vitest';
import { loadInitialState, appReducer, getInitialState } from '@/store/AppStore';
import mockData from '@/data/mock.json';

describe('UT-020 – Store (plan 4)', () => {
  const STORAGE_KEY = 'tbkn:v1';

  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Khởi tạo không có localStorage -> state = mock', () => {
    const state = loadInitialState(STORAGE_KEY);
    expect(state.reports).toHaveLength(64);
    expect(state.volunteerTasks).toHaveLength(4);
    expect(state.reports[0]?.id).toBe('TB-0001');
  });

  it('2. Có localStorage hợp lệ -> state = localStorage', () => {
    const customState = {
      ...getInitialState(),
      reports: [
        {
          ...mockData.reports[0],
          id: 'TB-9999',
          address: 'Địa chỉ lưu trữ',
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customState));

    const state = loadInitialState(STORAGE_KEY);
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0]?.id).toBe('TB-9999');
    expect(state.reports[0]?.address).toBe('Địa chỉ lưu trữ');
  });

  it('3. localStorage hỏng (JSON lỗi) -> fallback mock + không crash', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json {{{');
    const state = loadInitialState(STORAGE_KEY);
    expect(state.reports).toHaveLength(64);
    expect(state.reports[0]?.id).toBe('TB-0001');
  });

  it('4. Reducer xử lý HYDRATE', () => {
    const initialState = getInitialState();
    const newState = {
      ...initialState,
      reports: [],
    };
    const updated = appReducer(initialState, { type: 'HYDRATE', payload: newState });
    expect(updated.reports).toHaveLength(0);
  });
});
