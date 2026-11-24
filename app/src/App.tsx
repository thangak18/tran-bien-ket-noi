import { Routes, Route } from 'react-router-dom';
import { C01Home } from './screens/citizen/C01Home';
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
import { V01Tasks } from './screens/volunteer/V01Tasks';
import { V02Verify } from './screens/volunteer/V02Verify';
import { DemoHub } from './screens/demo/DemoHub';
import { DevUiGallery } from './screens/dev/DevUiGallery';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<C01Home />} />
      <Route path="/bao-su-co/anh" element={<C02Photo />} />
      <Route path="/bao-su-co/vi-tri" element={<C03Location />} />
      <Route path="/bao-su-co/xac-nhan" element={<C04Confirm />} />
      <Route path="/cua-toi" element={<C05Mine />} />
      <Route path="/phan-anh/:id" element={<C06Detail />} />
      <Route path="/quanh-day" element={<C07Nearby />} />
      <Route path="/minh-bach" element={<C08Transparency />} />
      <Route path="/can-bo" element={<A01Inbox />} />
      <Route path="/can-bo/:id" element={<A02Panel />} />
      <Route path="/can-bo/:id/ket-qua" element={<A03Result />} />
      <Route path="/tnv" element={<V01Tasks />} />
      <Route path="/tnv/:taskId" element={<V02Verify />} />
      <Route path="/demo" element={<DemoHub />} />
      {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiGallery />} />}
    </Routes>
  );
}
