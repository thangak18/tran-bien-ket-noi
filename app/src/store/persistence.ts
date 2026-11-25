import { AppAction, AppState, getInitialState } from './AppStore';
import { Settings } from '../domain/types';
import mockData from '../data/mock.json';

export const DEFAULT_STORAGE_KEY = 'tbkn:v1';
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

  const timerKey = `${storageKey}:${frame}`;
  const existingTimer = debounceTimers.get(timerKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
    debounceTimers.delete(timerKey);
    pendingSaves.delete(timerKey);
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
const pendingSaves = new Map<string, () => void>();

/**
 * Ghi ngay toàn bộ bản lưu đang chờ debounce (dùng trước khi tải lại / đóng trang)
 */
export function flushPendingSaves(): void {
  const callbacks = Array.from(pendingSaves.values());
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  pendingSaves.clear();
  for (const fn of callbacks) {
    try {
      fn();
    } catch {
      // Bỏ qua lỗi quota khi đóng trang
    }
  }
}

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

  const runSave = () => {
    debounceTimers.delete(timerKey);
    pendingSaves.delete(timerKey);
    saveState(state, frame, storageKey);
  };

  pendingSaves.set(timerKey, runSave);
  const timer = setTimeout(runSave, delayMs);

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
        const seedById = new Map(baseState.reports.map((r) => [r.id, r]));
        const rawReports = parsedShared.reports as AppState['reports'];
        const seedLngs = new Set(
          rawReports.filter((r) => seedById.has(r.id)).map((r) => Number(r.lng).toFixed(3))
        );
        const hasColumnBug = rawReports.length >= 20 && seedLngs.size <= 4;

        reports = rawReports
          .filter((r) => {
            const isLegacyPlaceholder =
              typeof r.description === 'string' && r.description.includes('cần được kiểm');
            return !(isLegacyPlaceholder && !seedById.has(r.id));
          })
          .map((r) => {
            const fresh = seedById.get(r.id);
            if (!fresh) return r;
            const hasLegacyDesc =
              typeof r.description === 'string' && r.description.includes('cần được kiểm');
            const hasBrokenPhoto =
              Array.isArray(r.photos) &&
              r.photos.some(
                (p) =>
                  typeof p === 'string' &&
                  p.startsWith('/demo-photos/') &&
                  !/^\/demo-photos\/(den_duong|ngap_nuoc|rac_thai|mat_duong)\/[1-4]\.jpg$/.test(p)
              );
            if (hasColumnBug || hasLegacyDesc || hasBrokenPhoto) {
              return {
                ...r,
                lat: fresh.lat,
                lng: fresh.lng,
                address: fresh.address,
                description: fresh.description,
                photos: fresh.photos,
                resultPhotos: fresh.resultPhotos,
              };
            }
            return r;
          });
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
        const validFontScales = ['small', 'normal', 'large', 'xlarge'] as const;
        const fontScale = validFontScales.includes(parsedSettings.fontScale)
          ? (parsedSettings.fontScale as Settings['fontScale'])
          : undefined;
        settings = {
          seniorMode: !!parsedSettings.seniorMode,
          ...(fontScale ? { fontScale } : {}),
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
    reports: JSON.parse(JSON.stringify(mockData.reports)),
    volunteerTasks: JSON.parse(JSON.stringify(mockData.volunteerTasks)),
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
        dispatch({
          type: 'SET_SETTINGS',
          payload: {
            ...parsedSettings,
            phone: parsedSettings.phone,
          },
        });
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
