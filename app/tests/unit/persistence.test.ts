import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveState,
  saveStateDebounced,
  loadPersistedState,
  resetStorage,
  setupStorageSync,
  getSettingsKey,
  DEFAULT_STORAGE_KEY,
} from '@/store/persistence';
import { getInitialState, AppState, AppAction } from '@/store/AppStore';

describe('UT-023 – Persistence & Multi-frame Sync (plan 4, AC-DEMO-3/4)', () => {
  let state: AppState;

  beforeEach(() => {
    localStorage.clear();
    state = getInitialState();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('1. Dispatch -> localStorage cập nhật sau <= 150ms (debounce)', async () => {
    vi.useFakeTimers();

    const customReport = {
      ...state.reports[0]!,
      id: 'TB-9999',
      address: 'Đường mới cập nhật',
    };
    const modifiedState: AppState = {
      ...state,
      reports: [customReport],
    };

    saveStateDebounced(modifiedState, 'left', 100);

    // Chưa đủ 100ms: chưa lưu vào localStorage
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();

    // Chờ 120ms (vượt quá 100ms nhưng <= 150ms)
    vi.advanceTimersByTime(120);

    const raw = localStorage.getItem(DEFAULT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.reports).toHaveLength(1);
    expect(parsed.reports[0].id).toBe('TB-9999');
  });

  it('2. Giả lập storage event với state mới -> store hydrate', () => {
    let dispatchedAction: AppAction | null = null;
    const dispatch = (action: AppAction) => {
      dispatchedAction = action;
    };

    const cleanup = setupStorageSync(dispatch, 'left');

    const updatedState = {
      ...getInitialState(),
      reports: [
        {
          ...state.reports[0]!,
          id: 'TB-SYNC-01',
        },
      ],
    };

    // Giả lập storage event
    const event = new StorageEvent('storage', {
      key: DEFAULT_STORAGE_KEY,
      newValue: JSON.stringify(updatedState),
    });
    window.dispatchEvent(event);

    expect(dispatchedAction).not.toBeNull();
    if (dispatchedAction) {
      expect((dispatchedAction as AppAction).type).toBe('HYDRATE');
      const payload = (dispatchedAction as { type: 'HYDRATE'; payload: AppState }).payload;
      expect(payload.reports[0]?.id).toBe('TB-SYNC-01');
    }

    cleanup();
  });

  it('3. Settings ghi theo khoá tbkn:settings:left / right độc lập', () => {
    const leftState: AppState = {
      ...state,
      settings: {
        seniorMode: true,
        phone: '0909111111',
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [{ id: 'TB-0065', secretCode: '1111' }],
        anonymousLog: ['2026-11-24T08:00:00+07:00'],
      },
    };

    const rightState: AppState = {
      ...state,
      settings: {
        seniorMode: false,
        phone: '0909222222',
        demoNow: '2026-11-24T09:00:00+07:00',
        deviceReports: [{ id: 'TB-0066', secretCode: '2222' }],
        anonymousLog: [],
      },
    };

    saveState(leftState, 'left');
    saveState(rightState, 'right');

    const leftKey = getSettingsKey('left');
    const rightKey = getSettingsKey('right');

    expect(leftKey).toBe('tbkn:settings:left');
    expect(rightKey).toBe('tbkn:settings:right');

    const leftStored = JSON.parse(localStorage.getItem(leftKey)!);
    const rightStored = JSON.parse(localStorage.getItem(rightKey)!);

    expect(leftStored.seniorMode).toBe(true);
    expect(leftStored.phone).toBe('0909111111');
    expect(leftStored.deviceReports).toEqual([{ id: 'TB-0065', secretCode: '1111' }]);

    expect(rightStored.seniorMode).toBe(false);
    expect(rightStored.phone).toBe('0909222222');
    expect(rightStored.deviceReports).toEqual([{ id: 'TB-0066', secretCode: '2222' }]);
  });

  it('4. reset xoá dữ liệu và nạp lại mock', () => {
    // Lưu dữ liệu tùy biến vào storage
    const custom = {
      ...state,
      reports: [],
    };
    saveState(custom, 'left');
    expect(loadPersistedState('left').reports).toHaveLength(0);

    // Reset
    const resetted = resetStorage();
    expect(resetted.reports).toHaveLength(64);
    expect(resetted.reports[0]?.id).toBe('TB-0001');

    // Kiểm tra load lại từ storage sau reset
    const reloaded = loadPersistedState('left');
    expect(reloaded.reports).toHaveLength(64);
  });

  it('5. setItem ném QuotaExceededError -> action trả lỗi có thông điệp tiếng Việt, state không mất', () => {
    // Giả lập lỗi bộ nhớ đầy
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      throw err;
    });

    expect(() => saveState(state, 'left')).toThrowError(/bộ nhớ|đầy|đặt lại dữ liệu/i);

    // State không mất
    expect(state.reports).toHaveLength(64);

    spy.mockRestore();
  });

  it('6. deviceReports khung left không xuất hiện ở khung right (mỗi máy tự nhớ riêng)', () => {
    const leftState: AppState = {
      ...state,
      settings: {
        ...state.settings,
        deviceReports: [{ id: 'TB-0065', secretCode: '4321' }],
      },
    };

    saveState(leftState, 'left');

    const loadedLeft = loadPersistedState('left');
    const loadedRight = loadPersistedState('right');

    expect(loadedLeft.settings.deviceReports).toEqual([{ id: 'TB-0065', secretCode: '4321' }]);
    expect(loadedRight.settings.deviceReports).toEqual([]);
  });
});
