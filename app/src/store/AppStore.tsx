import { createContext, useContext, useReducer, useEffect, ReactNode, Dispatch } from 'react';
import { Notification, Report, ReportDraft, Settings, VolunteerTask } from '../domain/types';
import { DEMO_NOW } from '../domain/constants';
import mockData from '../data/mock.json';
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
  | { type: 'SET_REPORTS'; payload: Report[] }
  | { type: 'SET_TASKS'; payload: VolunteerTask[] }
  | { type: 'ADD_REPORT'; payload: { report: Report; notification?: Notification } }
  | { type: 'UPDATE_REPORT'; payload: { report: Report; notification?: Notification } }
  | { type: 'ADD_TASK'; payload: VolunteerTask }
  | { type: 'UPDATE_TASK'; payload: VolunteerTask }
  | { type: 'MARK_NOTIFICATIONS_READ'; payload?: { phone?: string } };

export const DEFAULT_STORAGE_KEY = 'tbkn:v1';

export function getInitialState(): AppState {
  return {
    reports: JSON.parse(JSON.stringify(mockData.reports)),
    volunteerTasks: JSON.parse(JSON.stringify(mockData.volunteerTasks)),
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

    case 'SET_REPORTS':
      return {
        ...state,
        reports: action.payload,
      };

    case 'SET_TASKS':
      return {
        ...state,
        volunteerTasks: action.payload,
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

    default:
      return state;
  }
}

interface AppStoreContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export const AppStoreContext = createContext<AppStoreContextValue | null>(null);

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
    initialState ?? loadPersistedState(frame, DEFAULT_STORAGE_KEY)
  );

  useEffect(() => {
    return setupStorageSync(dispatch, frame, DEFAULT_STORAGE_KEY);
  }, [frame]);

  useEffect(() => {
    saveStateDebounced(state, frame, 100, DEFAULT_STORAGE_KEY);
  }, [state, frame]);

  useEffect(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATA_SOURCE === 'api') {
      const syncApiData = async () => {
        try {
          const { dataSource } = await import('../data');
          const isOfficer = localStorage.getItem('tbkn_user_role') === 'can_bo';
          const isVolunteer = localStorage.getItem('tbkn_user_role') === 'tnv';

          let reps: Report[] = [];
          if (isOfficer) {
            reps = await dataSource.getOfficerReports().catch(() => dataSource.getReports());
          } else {
            reps = await dataSource.getReports();
          }

          if (reps && reps.length > 0) {
            dispatch({ type: 'SET_REPORTS', payload: reps });
          }

          if (isVolunteer || isOfficer) {
            const tasks = await dataSource.getVolunteerTasks().catch(() => []);
            if (tasks && tasks.length > 0) {
              dispatch({ type: 'SET_TASKS', payload: tasks });
            }
          }
        } catch (err) {
          console.error('Lỗi đồng bộ dữ liệu API vào store:', err);
        }
      };

      syncApiData();
      const interval = setInterval(syncApiData, 30000);
      return () => clearInterval(interval);
    }
  }, []);

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
