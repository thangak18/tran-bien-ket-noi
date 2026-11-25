import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { applyFontScale, resolveFontScale } from './lib/senior';
import { applyTheme, getInitialTheme } from './lib/theme';
import { PortalSwitcherFab } from './components/common/PortalSwitcherFab';
import { isApiMode } from './lib/api';
import { CitizenLayout } from './layouts/CitizenLayout';
import { C01Home } from './screens/citizen/C01Home';
import { WelcomeScreen, WELCOMED_STORAGE_KEY } from './screens/citizen/WelcomeScreen';
import { C02Photo } from './screens/citizen/C02Photo';
import { C03Location } from './screens/citizen/C03Location';
import { C04Confirm } from './screens/citizen/C04Confirm';
import { C05Mine } from './screens/citizen/C05Mine';
import { C06Detail } from './screens/citizen/C06Detail';
import { C07Nearby } from './screens/citizen/C07Nearby';
import { C08Transparency } from './screens/citizen/C08Transparency';
import { A01Inbox } from './screens/officer/A01Inbox';
import { A02Panel } from './screens/officer/A02Panel';
import { A03Result } from './screens/officer/A03Result';
import { OfficerProfile } from './screens/officer/OfficerProfile';
import { OfficerStats } from './screens/officer/OfficerStats';
import { V01Tasks } from './screens/volunteer/V01Tasks';
import { V02Verify } from './screens/volunteer/V02Verify';
import { VolunteerStats } from './screens/volunteer/VolunteerStats';
import { LoginScreen } from './screens/auth/LoginScreen';
import { ForbiddenScreen } from './screens/auth/ForbiddenScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthEvents } from './components/auth/AuthEvents';
import { DevUiGallery } from './screens/dev/DevUiGallery';

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
              <V01Tasks />
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
        {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiGallery />} />}
      </Routes>
    </AppStoreProvider>
  );
}
