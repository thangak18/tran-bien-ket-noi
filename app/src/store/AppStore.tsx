import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import { Notification, Report, ReportDraft, Settings, VolunteerTask } from '../domain/types';
import { DEMO_NOW } from '../domain/constants';
import mockData from '../data/mock.json';

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
  if (typeof window === 'undefined' || !window.localStorage) {
    return getInitialState();
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return getInitialState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.reports)) {
      return getInitialState();
    }
    return {
      reports: parsed.reports ?? [],
      volunteerTasks: parsed.volunteerTasks ?? [],
      notifications: parsed.notifications ?? [],
      settings: {
        seniorMode: !!parsed.settings?.seniorMode,
        phone: parsed.settings?.phone,
        demoNow: parsed.settings?.demoNow ?? DEMO_NOW,
        deviceReports: parsed.settings?.deviceReports ?? [],
        anonymousLog: parsed.settings?.anonymousLog ?? [],
      },
      draft: parsed.draft ?? { photos: [] },
    };
  } catch {
    return getInitialState();
  }
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
}: {
  children: ReactNode;
  initialState?: AppState;
}) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState ?? loadInitialState(DEFAULT_STORAGE_KEY)
  );

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
