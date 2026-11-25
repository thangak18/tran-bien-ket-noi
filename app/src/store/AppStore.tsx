import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  Dispatch,
} from 'react';
import { Notification, Report, ReportDraft, Settings, VolunteerTask } from '../domain/types';
import { DEMO_NOW } from '../domain/constants';
import mockData from '../data/mock.json';
import { loadPersistedState, saveStateDebounced, setupStorageSync } from './persistence';
import { SESSION_CHANGED_EVENT } from '../lib/api';

const API_MODE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATA_SOURCE === 'api';

export interface AppState {
  reports: Report[];
  volunteerTasks: VolunteerTask[];
  notifications: Notification[];
  settings: Settings;
  draft: ReportDraft;
}

export type AppAction =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'RESET' }
  | { type: 'SET_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_DRAFT'; payload: Partial<ReportDraft> }
  | { type: 'CLEAR_DRAFT' }
  | { type: 'SET_REPORTS'; payload: Report[] }
  | { type: 'SET_TASKS'; payload: VolunteerTask[] }
  | { type: 'ADD_REPORT'; payload: { report: Report; notification?: Notification } }
  | { type: 'UPDATE_REPORT'; payload: { report: Report; notification?: Notification } }
  | { type: 'ADD_TASK'; payload: VolunteerTask }
  | { type: 'UPDATE_TASK'; payload: VolunteerTask }
  | { type: 'MARK_NOTIFICATIONS_READ'; payload?: { phone?: string } };

// Chế độ API dùng khoá riêng để không lẫn dữ liệu mô phỏng của chế độ local.
export const DEFAULT_STORAGE_KEY = API_MODE ? 'tbkn:api:v1' : 'tbkn:v1';

export function getInitialState(): AppState {
  return {
    // Chế độ API: dữ liệu đến từ server, không khởi tạo từ dữ liệu mẫu.
    reports: API_MODE ? [] : JSON.parse(JSON.stringify(mockData.reports)),
    volunteerTasks: API_MODE ? [] : JSON.parse(JSON.stringify(mockData.volunteerTasks)),
    notifications: [],
    settings: {
      seniorMode: false,
      demoNow: DEMO_NOW,
      deviceReports: [],
      anonymousLog: [],
    },
    draft: { photos: [] },
  };
}

export function loadInitialState(storageKey: string = DEFAULT_STORAGE_KEY): AppState {
  return loadPersistedState(undefined, storageKey);
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.payload };

    case 'RESET':
      return getInitialState();

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case 'SET_DRAFT':
      return {
        ...state,
        draft: {
          ...state.draft,
          ...action.payload,
        },
      };

    case 'CLEAR_DRAFT':
      return {
        ...state,
        draft: { photos: [] },
      };

    case 'SET_REPORTS': {
      // Danh sách từ API không kèm lịch sử xử lý; giữ lịch sử đã tải ở màn chi tiết nếu hồ sơ chưa đổi version.
      const previous = new Map(state.reports.map((r) => [r.id, r]));
      return {
        ...state,
        reports: action.payload.map((r) => {
          const old = previous.get(r.id);
          if (
            old &&
            r.timeline.length === 0 &&
            old.timeline.length > 0 &&
            old.version === r.version
          ) {
            return { ...r, timeline: old.timeline };
          }
          return r;
        }),
      };
    }

    case 'SET_TASKS':
      return {
        ...state,
        volunteerTasks: action.payload,
      };

    case 'ADD_REPORT': {
      const newNotifications = action.payload.notification
        ? [action.payload.notification, ...state.notifications]
        : state.notifications;
      // Hồ sơ đã có trong store thì thay thế tại chỗ (tải lại chi tiết không tạo bản trùng).
      const exists = state.reports.some((r) => r.id === action.payload.report.id);
      return {
        ...state,
        reports: exists
          ? state.reports.map((r) =>
              r.id === action.payload.report.id ? action.payload.report : r
            )
          : [action.payload.report, ...state.reports],
        notifications: newNotifications,
      };
    }

    case 'UPDATE_REPORT': {
      const updatedReports = state.reports.map((r) =>
        r.id === action.payload.report.id ? action.payload.report : r
      );
      const newNotifications = action.payload.notification
        ? [action.payload.notification, ...state.notifications]
        : state.notifications;
      return {
        ...state,
        reports: updatedReports,
        notifications: newNotifications,
      };
    }

    case 'ADD_TASK':
      return {
        ...state,
        volunteerTasks: [action.payload, ...state.volunteerTasks],
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        volunteerTasks: state.volunteerTasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };

    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          !action.payload?.phone || n.phone === action.payload.phone ? { ...n, read: true } : n
        ),
      };

    default:
      return state;
  }
}

interface AppStoreContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  /** Chế độ API: tải lại danh sách hồ sơ và nhiệm vụ từ server vào store. Chế độ local: không làm gì. */
  refresh?: () => Promise<void>;
}

/** Tải hồ sơ và nhiệm vụ từ API theo vai trò đang đăng nhập rồi ghi vào store. */
export async function syncApiStore(dispatch: Dispatch<AppAction>): Promise<void> {
  const { dataSource } = await import('../data');
  const role = localStorage.getItem('tbkn_user_role');
  const isOfficer = role === 'can_bo';
  const isVolunteer = role === 'tnv';

  const reports = isOfficer
    ? await dataSource.getOfficerReports().catch(() => dataSource.getReports({ limit: 100 }))
    : await dataSource.getReports({ limit: 100 });
  dispatch({ type: 'SET_REPORTS', payload: reports });

  if (isVolunteer || isOfficer) {
    const tasks = await dataSource.getVolunteerTasks().catch(() => []);
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({
  children,
  initialState,
  frame,
}: {
  children: ReactNode;
  initialState?: AppState;
  frame?: string;
}) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState ??
      (() => {
        const isTestEnv =
          typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
        if (isTestEnv) {
          return loadPersistedState(frame, DEFAULT_STORAGE_KEY);
        }
        return loadPersistedState(frame, 'tbkn:live:v1', true);
      })()
  );

  const activeStorageKey =
    typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')
      ? DEFAULT_STORAGE_KEY
      : 'tbkn:live:v1';

  useEffect(() => {
    return setupStorageSync(dispatch, frame, activeStorageKey);
  }, [frame, activeStorageKey]);

  useEffect(() => {
    saveStateDebounced(state, frame, 100, activeStorageKey);
  }, [state, frame, activeStorageKey]);

  const refresh = useCallback(async () => {
    if (!API_MODE) return;
    try {
      await syncApiStore(dispatch);
    } catch (err) {
      console.error('Lỗi đồng bộ dữ liệu API vào store:', err);
    }
  }, []);

  useEffect(() => {
    if (!API_MODE) return;
    void refresh();
    const interval = setInterval(() => void refresh(), 30000);
    // Đăng nhập/đăng xuất đổi vai trò: tải lại dữ liệu đúng quyền ngay.
    const onSessionChanged = () => void refresh();
    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    };
  }, [refresh]);

  return (
    <AppStoreContext.Provider value={{ state, dispatch, refresh }}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreContextValue {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore phải được dùng bên trong AppStoreProvider');
  }
  return context;
}
