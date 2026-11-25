import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  ReactNode,
  Dispatch,
} from 'react';
import {
  Notification,
  Report,
  ReportDraft,
  Settings,
  Status,
  TimelineEntry,
  VolunteerTask,
} from '../domain/types';
import { DEMO_NOW } from '../domain/constants';
import {
  createReportApi,
  createTaskApi,
  fetchReportsApi,
  getApiBaseUrl,
  getAuthToken,
  RemoteReportItem,
  updateReportApi,
  verifyOtpApi,
} from '../lib/apiClient';
import { getOfficerSession, getVolunteerSession } from '../lib/portalSession';
import { loadPersistedState, saveStateDebounced, setupStorageSync } from './persistence';

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
  | { type: 'ADD_REPORT'; payload: { report: Report; notification?: Notification } }
  | { type: 'UPDATE_REPORT'; payload: { report: Report; notification?: Notification } }
  | { type: 'ADD_TASK'; payload: VolunteerTask }
  | { type: 'UPDATE_TASK'; payload: VolunteerTask }
  | { type: 'MARK_NOTIFICATIONS_READ'; payload?: { phone?: string } }
  | { type: 'MERGE_REMOTE_REPORTS'; payload: RemoteReportItem[] };

export const DEFAULT_STORAGE_KEY = 'tbkn:v2';

export function getInitialState(): AppState {
  return {
    reports: [],
    volunteerTasks: [],
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

    case 'ADD_REPORT': {
      const newNotifications = action.payload.notification
        ? [action.payload.notification, ...state.notifications]
        : state.notifications;
      return {
        ...state,
        reports: [action.payload.report, ...state.reports],
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

    case 'MERGE_REMOTE_REPORTS': {
      if (action.payload.length === 0) return state;
      const byId = new Map<string, Report>(state.reports.map((r) => [r.id, r]));
      const newlyAdded: Report[] = [];

      for (const remote of action.payload) {
        const existing = byId.get(remote.id);
        const timeline: TimelineEntry[] = Array.isArray(remote.timeline)
          ? remote.timeline.map((t) => ({
              at: t.at,
              status: t.status as Status,
              actor: t.actor,
              note: t.note,
            }))
          : [];

        if (existing) {
          byId.set(remote.id, {
            ...existing,
            status: (remote.status as Status) || existing.status,
            department: remote.department ?? existing.department,
            dueAt: remote.dueAt ?? existing.dueAt,
            completedAt: remote.completedAt ?? existing.completedAt,
            resultPhotos:
              remote.resultPhotos && remote.resultPhotos.length > 0
                ? remote.resultPhotos
                : existing.resultPhotos,
            timeline: timeline.length >= existing.timeline.length ? timeline : existing.timeline,
          });
        } else {
          newlyAdded.push({
            id: remote.id,
            category: remote.category,
            title: remote.title,
            description: remote.description,
            photos: remote.photos.length > 0 ? remote.photos : ['/demo-photos/placeholder.jpg'],
            resultPhotos: remote.resultPhotos,
            lat: remote.lat,
            lng: remote.lng,
            address: remote.address,
            locationNote: remote.locationNote,
            status: (remote.status as Status) || 'moi',
            department: remote.department ?? undefined,
            createdAt: remote.createdAt,
            dueAt: remote.dueAt ?? undefined,
            completedAt: remote.completedAt ?? undefined,
            anonymous: remote.anonymous,
            photosApproved: true,
            priority: 'binh_thuong',
            subscribedLater: false,
            secretCode: '',
            onBehalf: false,
            followers: [],
            anonymousFollows: 0,
            timeline,
          });
        }
      }

      const merged = [...newlyAdded, ...state.reports.map((r) => byId.get(r.id) ?? r)];
      return { ...state, reports: merged };
    }

    default:
      return state;
  }
}

interface AppStoreContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
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
  const [state, dispatch] = useReducer(appReducer, initialState, (init) => {
    if (init) return init;
    const isTestEnv =
      typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
    if (isTestEnv) {
      return loadPersistedState(frame, DEFAULT_STORAGE_KEY);
    }
    return loadPersistedState(frame, 'tbkn:live:v1', true);
  });

  const activeStorageKey =
    typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')
      ? DEFAULT_STORAGE_KEY
      : 'tbkn:live:v1';

  const prevReportSnapRef = useRef<Map<string, string> | null>(null);
  const prevTaskIdsRef = useRef<Set<string> | null>(null);
  const isPullingRemoteRef = useRef<boolean>(false);

  useEffect(() => {
    return setupStorageSync(dispatch, frame, activeStorageKey);
  }, [frame, activeStorageKey]);

  useEffect(() => {
    saveStateDebounced(state, frame, 100, activeStorageKey);
  }, [state, frame, activeStorageKey]);

  // Đảm bảo phiên Cán bộ / TNV đã lưu trên trình duyệt luôn có JWT token để ghi D1
  useEffect(() => {
    const isTestEnv =
      typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
    if (isTestEnv || !getApiBaseUrl() || getAuthToken()) return;

    const officer = getOfficerSession();
    if (officer) {
      void verifyOtpApi({
        phone: officer.phone.replace(/\D/g, ''),
        otp: '123456',
        name: officer.name,
        role: 'officer',
        unit: officer.unit,
      });
      return;
    }
    const volunteer = getVolunteerSession();
    if (volunteer) {
      void verifyOtpApi({
        phone: volunteer.phone.replace(/\D/g, ''),
        otp: '123456',
        name: volunteer.name,
        role: 'volunteer',
        unit: volunteer.area,
      });
    }
  }, []);

  // Đồng bộ 2 chiều với Cloudflare D1 (chỉ chạy trên trình duyệt thật khi có VITE_API_BASE_URL)
  useEffect(() => {
    const isTestEnv =
      typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
    if (isTestEnv || !getApiBaseUrl()) return;

    let active = true;
    const pullFromD1 = async () => {
      const res = await fetchReportsApi(100);
      if (!active || !res?.configured || res.items.length === 0) return;
      isPullingRemoteRef.current = true;
      dispatch({ type: 'MERGE_REMOTE_REPORTS', payload: res.items });
    };

    void pullFromD1();
    const onFocus = () => {
      void pullFromD1();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const isTestEnv =
      typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
    if (isTestEnv || !getApiBaseUrl()) return;

    const nextSnap = new Map<string, string>();
    for (const r of state.reports) {
      nextSnap.set(
        r.id,
        `${r.status}|${r.department ?? ''}|${r.dueAt ?? ''}|${r.resultPhotos?.length ?? 0}|${r.timeline.length}`
      );
    }

    if (isPullingRemoteRef.current) {
      isPullingRemoteRef.current = false;
      prevReportSnapRef.current = nextSnap;
      return;
    }

    const prevSnap = prevReportSnapRef.current;
    prevReportSnapRef.current = nextSnap;
    if (!prevSnap) return;

    for (const r of state.reports) {
      const prevSig = prevSnap.get(r.id);
      const nextSig = nextSnap.get(r.id);
      if (!prevSig) {
        // Hồ sơ mới (kể cả Cán bộ tạo phản ánh hộ) -> tạo trên D1
        void createReportApi({
          id: r.id,
          category: r.category,
          title: r.title,
          description: r.description,
          photos: r.photos,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          locationNote: r.locationNote,
          anonymous: r.anonymous,
        });
      } else if (nextSig && prevSig !== nextSig) {
        // Hồ sơ vừa được Cán bộ / TNV cập nhật -> upsert vào D1
        void updateReportApi(r.id, {
          category: r.category,
          title: r.title,
          description: r.description,
          photos: r.photos,
          lat: r.lat,
          lng: r.lng,
          address: r.address,
          locationNote: r.locationNote,
          anonymous: r.anonymous,
          createdAt: r.createdAt,
          status: r.status,
          department: r.department,
          dueAt: r.dueAt,
          resultPhotos: r.resultPhotos,
          timeline: r.timeline,
        });
      }
    }
  }, [state.reports]);

  // Đồng bộ nhiệm vụ TNV mới khi Cán bộ giao việc ở A02Panel
  useEffect(() => {
    const isTestEnv =
      typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
    if (isTestEnv || !getApiBaseUrl()) return;

    const nextIds = new Set(state.volunteerTasks.map((t) => t.id));
    const prevIds = prevTaskIdsRef.current;
    prevTaskIdsRef.current = nextIds;
    if (!prevIds) return;

    for (const task of state.volunteerTasks) {
      if (!prevIds.has(task.id)) {
        void createTaskApi({
          reportId: task.reportId,
          assigneeName: task.assignee ?? undefined,
          taskType: task.type,
        });
      }
    }
  }, [state.volunteerTasks]);

  return (
    <AppStoreContext.Provider value={{ state, dispatch }}>{children}</AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreContextValue {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore phải được dùng bên trong AppStoreProvider');
  }
  return context;
}
