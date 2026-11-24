import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { applySeniorMode } from './lib/senior';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { CitizenLayout } from './layouts/CitizenLayout';
import { C01Home } from './screens/citizen/C01Home';
import { C02Photo } from './screens/citizen/C02Photo';
import { C03Location } from './screens/citizen/C03Location';
import { C04Confirm } from './screens/citizen/C04Confirm';
import { C05Mine } from './screens/citizen/C05Mine';
import { C06Detail } from './screens/citizen/C06Detail';
import { C07Nearby } from './screens/citizen/C07Nearby';
import { C08Transparency } from './screens/citizen/C08Transparency';
import { ProfileScreen } from './screens/citizen/ProfileScreen';
import { SearchScreen } from './screens/citizen/SearchScreen';
import { A01Inbox } from './screens/officer/A01Inbox';
import { A02Panel } from './screens/officer/A02Panel';
import { A03Result } from './screens/officer/A03Result';
import { V01Tasks } from './screens/volunteer/V01Tasks';
import { V02Verify } from './screens/volunteer/V02Verify';
import { LoginScreen } from './screens/auth/LoginScreen';
import { ForbiddenScreen } from './screens/auth/ForbiddenScreen';
import { DemoHub } from './screens/demo/DemoHub';
import { DevUiGallery } from './screens/dev/DevUiGallery';

/** Đồng bộ lớp CSS chữ lớn với cài đặt đã lưu (kể cả sau khi tải lại trang) */
function SeniorSync() {
  const { state } = useAppStore();
  const enabled = Boolean(state.settings.seniorMode);
  useEffect(() => {
    applySeniorMode(enabled);
  }, [enabled]);
  return null;
}

export default function App() {
  return (
    <AppStoreProvider>
      <SeniorSync />
      <RoleSwitcher />
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
          path="/bao-su-co/anh"
          element={
            <CitizenLayout>
              <C02Photo />
            </CitizenLayout>
          }
        />
        <Route
          path="/bao-su-co/vi-tri"
          element={
            <CitizenLayout>
              <C03Location />
            </CitizenLayout>
          }
        />
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
          path="/phan-anh/:id"
          element={
            <CitizenLayout>
              <C06Detail />
            </CitizenLayout>
          }
        />
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
        <Route
          path="/ho-so"
          element={
            <CitizenLayout>
              <ProfileScreen />
            </CitizenLayout>
          }
        />
        <Route
          path="/tim-kiem"
          element={
            <CitizenLayout>
              <SearchScreen />
            </CitizenLayout>
          }
        />
        <Route path="/can-bo" element={<A01Inbox />} />
        <Route path="/can-bo/:id" element={<A02Panel />} />
        <Route path="/can-bo/:id/ket-qua" element={<A03Result />} />
        <Route path="/tnv" element={<V01Tasks />} />
        <Route path="/tnv/:taskId" element={<V02Verify />} />
        <Route path="/dang-nhap" element={<LoginScreen />} />
        <Route path="/khong-co-quyen" element={<ForbiddenScreen />} />
        <Route path="/demo" element={<DemoHub />} />
        {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiGallery />} />}
      </Routes>
    </AppStoreProvider>
  );
}
