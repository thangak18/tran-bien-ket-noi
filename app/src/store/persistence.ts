import { AppAction, AppState, getInitialState } from './AppStore';
import { Settings } from '../domain/types';

export const DEFAULT_STORAGE_KEY = 'tbkn:v2';
export const SETTINGS_STORAGE_KEY_PREFIX = 'tbkn:settings:';

/**
 * Lấy frame id từ URL param ?frame=left|right hoặc mặc định 'left'
 */
export function getFrameId(urlSearch?: string): string {
  if (typeof urlSearch === 'string') {
    const params = new URLSearchParams(urlSearch);
    return params.get('frame') || 'left';
  }
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    return params.get('frame') || 'left';
  }
  return 'left';
}

/**
 * Lấy khoá storage cho settings theo frame
 */
export function getSettingsKey(frame: string = getFrameId()): string {
  return `${SETTINGS_STORAGE_KEY_PREFIX}${frame}`;
}

/**
 * Lưu state vào localStorage (dữ liệu chung + settings riêng theo frame)
 */
export function saveState(
  state: AppState,
  frame: string = getFrameId(),
  storageKey: string = DEFAULT_STORAGE_KEY
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const sharedData = {
      reports: state.reports,
      volunteerTasks: state.volunteerTasks,
      notifications: state.notifications,
      draft: state.draft,
    };
    localStorage.setItem(storageKey, JSON.stringify(sharedData));
    localStorage.setItem(getSettingsKey(frame), JSON.stringify(state.settings));
  } catch (error) {
    if (
      (error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          error.code === 22)) ||
      (error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.message.includes('quota'))) ||
      (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name: string }).name === 'QuotaExceededError')
    ) {
      throw new Error(
        'Bộ nhớ trình duyệt đã đầy. Vui lòng nhấn "Đặt lại dữ liệu demo" để tiếp tục.'
      );
    }
    throw error;
  }
}

// Bộ đệm timer cho debounced save
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Lưu state có debounce (mặc định 100ms)
 */
export function saveStateDebounced(
  state: AppState,
  frame: string = getFrameId(),
  delayMs: number = 100,
  storageKey: string = DEFAULT_STORAGE_KEY
): void {
  const timerKey = `${storageKey}:${frame}`;
  const existingTimer = debounceTimers.get(timerKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    saveState(state, frame, storageKey);
    debounceTimers.delete(timerKey);
  }, delayMs);

  debounceTimers.set(timerKey, timer);
}

/**
 * Tải state đã lưu từ storage (kết hợp dữ liệu chung + settings theo frame)
 */
export function loadPersistedState(
  frame: string = getFrameId(),
  storageKey: string = DEFAULT_STORAGE_KEY,
  liveCleanDefault: boolean = false
): AppState {
  const initial = getInitialState();
  const baseState: AppState = liveCleanDefault
    ? {
        ...initial,
        reports: [],
        volunteerTasks: [],
        notifications: [],
      }
    : initial;

  if (typeof window === 'undefined' || !window.localStorage) {
    return baseState;
  }

  let reports = baseState.reports;
  let volunteerTasks = baseState.volunteerTasks;
  let notifications = baseState.notifications;
  let draft = baseState.draft;

  try {
    const rawShared = localStorage.getItem(storageKey);
    if (rawShared) {
      const parsedShared = JSON.parse(rawShared);
      if (parsedShared && Array.isArray(parsedShared.reports)) {
        reports = parsedShared.reports;
        volunteerTasks = parsedShared.volunteerTasks ?? baseState.volunteerTasks;
        notifications = parsedShared.notifications ?? [];
        draft = parsedShared.draft ?? baseState.draft;
      }
    }
  } catch {
    // Nếu JSON hỏng, giữ nguyên baseState
  }

  let settings: Settings = initial.settings;
  try {
    const rawSettings = localStorage.getItem(getSettingsKey(frame));
    if (rawSettings) {
      const parsedSettings = JSON.parse(rawSettings);
      if (parsedSettings && typeof parsedSettings === 'object') {
        settings = {
          seniorMode: !!parsedSettings.seniorMode,
          phone: parsedSettings.phone,
          demoNow: parsedSettings.demoNow ?? initial.settings.demoNow,
          deviceReports: Array.isArray(parsedSettings.deviceReports)
            ? parsedSettings.deviceReports
            : [],
          anonymousLog: Array.isArray(parsedSettings.anonymousLog)
            ? parsedSettings.anonymousLog
            : [],
        };
      }
    }
  } catch {
    // Giữ settings mặc định
  }

  return {
    reports,
    volunteerTasks,
    notifications,
    settings,
    draft,
  };
}

/**
 * Xoá toàn bộ dữ liệu demo trong storage và nạp lại từ mock
 */
export function resetStorage(storageKey: string = DEFAULT_STORAGE_KEY): AppState {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(getSettingsKey('left'));
    localStorage.removeItem(getSettingsKey('right'));
  }

  const freshState: AppState = {
    reports: [],
    volunteerTasks: [],
    notifications: [],
    settings: {
      seniorMode: false,
      demoNow: '2026-11-24T09:00:00+07:00',
      deviceReports: [],
      anonymousLog: [],
    },
    draft: { photos: [] },
  };

  saveState(freshState, 'left', storageKey);
  saveState(freshState, 'right', storageKey);

  return freshState;
}

/**
 * Thiết lập đồng bộ qua storage event giữa các frame / tab
 */
export function setupStorageSync(
  dispatch: (action: AppAction) => void,
  frame: string = getFrameId(),
  storageKey: string = DEFAULT_STORAGE_KEY
): () => void {
  if (typeof window === 'undefined' || !window.addEventListener) {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    // 1. Dữ liệu chung thay đổi
    if (event.key === storageKey) {
      if (event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          const current = loadPersistedState(frame, storageKey);
          const reloaded: AppState = {
            ...current,
            reports: Array.isArray(parsed.reports) ? parsed.reports : current.reports,
            volunteerTasks: Array.isArray(parsed.volunteerTasks)
              ? parsed.volunteerTasks
              : current.volunteerTasks,
            notifications: Array.isArray(parsed.notifications)
              ? parsed.notifications
              : current.notifications,
            draft: parsed.draft ?? current.draft,
          };
          dispatch({ type: 'HYDRATE', payload: reloaded });
          return;
        } catch {
          // Bỏ qua nếu parse lỗi, fallback sang loadPersistedState
        }
      }
      const reloaded = loadPersistedState(frame, storageKey);
      dispatch({ type: 'HYDRATE', payload: reloaded });
    }
    // 2. Settings của chính frame này thay đổi
    else if (event.key === getSettingsKey(frame) && event.newValue) {
      try {
        const parsedSettings = JSON.parse(event.newValue);
        dispatch({ type: 'SET_SETTINGS', payload: parsedSettings });
      } catch {
        // Bỏ qua nếu parse lỗi
      }
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
