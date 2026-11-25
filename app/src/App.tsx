import { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { applyFontScale, resolveFontScale } from './lib/senior';
import { applyTheme, getInitialTheme } from './lib/theme';
import { PortalSwitcherFab } from './components/common/PortalSwitcherFab';
import { isApiMode } from './lib/api';
import { CitizenLayout } from './layouts/CitizenLayout';
import { C01Home } from './screens/citizen/C01Home';
import { WelcomeScreen, WELCOMED_STORAGE_KEY } from './screens/citizen/WelcomeScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthEvents } from './components/auth/AuthEvents';

const C02Photo = lazy(() =>
  import('./screens/citizen/C02Photo').then((m) => ({ default: m.C02Photo }))
);
const C03Location = lazy(() =>
  import('./screens/citizen/C03Location').then((m) => ({ default: m.C03Location }))
);
const C04Confirm = lazy(() =>
  import('./screens/citizen/C04Confirm').then((m) => ({ default: m.C04Confirm }))
);
const C05Mine = lazy(() =>
  import('./screens/citizen/C05Mine').then((m) => ({ default: m.C05Mine }))
);
const C06Detail = lazy(() =>
  import('./screens/citizen/C06Detail').then((m) => ({ default: m.C06Detail }))
);
const C07Nearby = lazy(() =>
  import('./screens/citizen/C07Nearby').then((m) => ({ default: m.C07Nearby }))
);
const C08Transparency = lazy(() =>
  import('./screens/citizen/C08Transparency').then((m) => ({ default: m.C08Transparency }))
);
const C09Notifications = lazy(() =>
  import('./screens/citizen/C09Notifications').then((m) => ({ default: m.C09Notifications }))
);

const A01Inbox = lazy(() =>
  import('./screens/officer/A01Inbox').then((m) => ({ default: m.A01Inbox }))
);
const A02Panel = lazy(() =>
  import('./screens/officer/A02Panel').then((m) => ({ default: m.A02Panel }))
);
const A03Result = lazy(() =>
  import('./screens/officer/A03Result').then((m) => ({ default: m.A03Result }))
);
const OfficerProfile = lazy(() =>
  import('./screens/officer/OfficerProfile').then((m) => ({ default: m.OfficerProfile }))
);
const OfficerStats = lazy(() =>
  import('./screens/officer/OfficerStats').then((m) => ({ default: m.OfficerStats }))
);

const V01Tasks = lazy(() =>
  import('./screens/volunteer/V01Tasks').then((m) => ({ default: m.V01Tasks }))
);
const V02Verify = lazy(() =>
  import('./screens/volunteer/V02Verify').then((m) => ({ default: m.V02Verify }))
);
const V03Map = lazy(() =>
  import('./screens/volunteer/V03Map').then((m) => ({ default: m.V03Map }))
);
const VolunteerStats = lazy(() =>
  import('./screens/volunteer/VolunteerStats').then((m) => ({ default: m.VolunteerStats }))
);

const LoginScreen = lazy(() =>
  import('./screens/auth/LoginScreen').then((m) => ({ default: m.LoginScreen }))
);
const ForbiddenScreen = lazy(() =>
  import('./screens/auth/ForbiddenScreen').then((m) => ({ default: m.ForbiddenScreen }))
);
const DevUiGallery = lazy(() =>
  import('./screens/dev/DevUiGallery').then((m) => ({ default: m.DevUiGallery }))
);

const AdminLayout = lazy(() =>
  import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminOverview = lazy(() =>
  import('./screens/admin/AdminOverview').then((m) => ({ default: m.AdminOverview }))
);
const AdminStaffPage = lazy(() =>
  import('./screens/admin/AdminManagement').then((m) => ({ default: m.AdminStaffPage }))
);
const AdminDepartmentsPage = lazy(() =>
  import('./screens/admin/AdminManagement').then((m) => ({ default: m.AdminDepartmentsPage }))
);
const AdminCategorySettingsPage = lazy(() =>
  import('./screens/admin/AdminManagement').then((m) => ({
    default: m.AdminCategorySettingsPage,
  }))
);
const AdminAuditPage = lazy(() =>
  import('./screens/admin/AdminManagement').then((m) => ({ default: m.AdminAuditPage }))
);

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center px-4 text-sm font-semibold text-slate-500 dark:text-slate-400"
    >
      Đang tải màn hình...
    </div>
  );
}

function SeniorSync() {
  const { state } = useAppStore();
  const fontScale = resolveFontScale(state.settings);
  useEffect(() => {
    applyFontScale(fontScale);
  }, [fontScale]);
  return null;
}

function WelcomeGate() {
  const { pathname } = useLocation();
  const { state } = useAppStore();
  const [welcomed, setWelcomed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(WELCOMED_STORAGE_KEY) === '1';
  });

  if (pathname !== '/' || welcomed || state.settings.phone) {
    return null;
  }

  return <WelcomeScreen onComplete={() => setWelcomed(true)} />;
}

export default function App() {
  const [searchParams] = useSearchParams();
  const frame = searchParams.get('frame') ?? undefined;

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  return (
    <AppStoreProvider frame={frame}>
      <SeniorSync />
      <AuthEvents />
      <WelcomeGate />
      {!isApiMode() && <PortalSwitcherFab />}
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <CitizenLayout>
                <C01Home />
              </CitizenLayout>
            }
          />
          <Route
            path="/tim-kiem"
            element={
              <CitizenLayout>
                <C01Home />
              </CitizenLayout>
            }
          />
          <Route path="/bao-su-co/anh" element={<C02Photo />} />
          <Route path="/bao-su-co/vi-tri" element={<C03Location />} />
          <Route
            path="/bao-su-co/xac-nhan"
            element={
              <CitizenLayout>
                <C04Confirm />
              </CitizenLayout>
            }
          />
          <Route
            path="/cua-toi"
            element={
              <CitizenLayout>
                <C05Mine />
              </CitizenLayout>
            }
          />
          <Route
            path="/ho-so"
            element={
              <CitizenLayout>
                <C05Mine />
              </CitizenLayout>
            }
          />
          <Route
            path="/thong-bao"
            element={
              <CitizenLayout>
                <C09Notifications />
              </CitizenLayout>
            }
          />
          <Route path="/phan-anh/:id" element={<C06Detail />} />
          <Route
            path="/quanh-day"
            element={
              <CitizenLayout>
                <C07Nearby />
              </CitizenLayout>
            }
          />
          <Route
            path="/minh-bach"
            element={
              <CitizenLayout>
                <C08Transparency />
              </CitizenLayout>
            }
          />
          {/* Cổng cán bộ / TNV: chế độ API bắt buộc đăng nhập đúng vai trò (chế độ local không chặn) */}
          <Route
            path="/can-bo"
            element={
              <ProtectedRoute allowedRoles={['can_bo']}>
                <A01Inbox />
              </ProtectedRoute>
            }
          />
          <Route
            path="/can-bo/thong-ke"
            element={
              <ProtectedRoute allowedRoles={['can_bo']}>
                <OfficerStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/can-bo/ho-so"
            element={
              <ProtectedRoute allowedRoles={['can_bo']}>
                <OfficerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/can-bo/:id"
            element={
              <ProtectedRoute allowedRoles={['can_bo']}>
                <A02Panel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/can-bo/:id/ket-qua"
            element={
              <ProtectedRoute allowedRoles={['can_bo']}>
                <A03Result />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tnv"
            element={
              <ProtectedRoute allowedRoles={['tnv', 'can_bo']}>
                <V01Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tnv/ban-do"
            element={
              <ProtectedRoute allowedRoles={['tnv', 'can_bo']}>
                <V03Map />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tnv/ho-so"
            element={
              <ProtectedRoute allowedRoles={['tnv', 'can_bo']}>
                <V01Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tnv/thong-ke"
            element={
              <ProtectedRoute allowedRoles={['tnv', 'can_bo']}>
                <VolunteerStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tnv/:taskId"
            element={
              <ProtectedRoute allowedRoles={['tnv', 'can_bo']}>
                <V02Verify />
              </ProtectedRoute>
            }
          />
          <Route path="/dang-nhap" element={<LoginScreen />} />
          <Route path="/khong-co-quyen" element={<ForbiddenScreen />} />
          <Route
            path="/quan-tri"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="tai-khoan" element={<AdminStaffPage />} />
            <Route path="bo-phan" element={<AdminDepartmentsPage />} />
            <Route path="cau-hinh" element={<AdminCategorySettingsPage />} />
            <Route path="nhat-ky" element={<AdminAuditPage />} />
          </Route>
          {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiGallery />} />}
        </Routes>
      </Suspense>
    </AppStoreProvider>
  );
}
