import { useCallback, useEffect, useState } from 'react';
import { getCurrentLocation } from '@/lib/geolocation';

const GPS_STORAGE_KEY = 'tbkn:gps-enabled';
export const GPS_CHANGE_EVENT = 'tbkn:gps-change';

export function getInitialGpsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(GPS_STORAGE_KEY);
  return saved !== 'false';
}

function broadcastGpsChange(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GPS_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(GPS_CHANGE_EVENT, { detail: enabled }));
}

export function useGpsSetting() {
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(() => getInitialGpsEnabled());
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'ready' | 'denied' | 'error'>(
    'idle'
  );
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      const enabled = getInitialGpsEnabled();
      setGpsEnabled(enabled);
      if (!enabled) {
        setGpsCoords(null);
        setGpsStatus('idle');
      }
    };

    window.addEventListener(GPS_CHANGE_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(GPS_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!gpsEnabled || typeof navigator === 'undefined') return;

    let active = true;
    const syncPermissionAndCoords = async () => {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          const perm = await navigator.permissions.query({
            name: 'geolocation' as PermissionName,
          });
          if (!active) return;
          if (perm.state === 'denied') {
            setGpsEnabled(false);
            setGpsStatus('denied');
            broadcastGpsChange(false);
            return;
          }
          if (perm.state === 'granted') {
            const coords = await getCurrentLocation({ timeoutMs: 4000 }).catch(() => null);
            if (!active) return;
            if (coords) {
              setGpsCoords({ lat: coords.lat, lng: coords.lng });
              setGpsStatus('ready');
            }
          }
        } catch {
          // Ignore browsers without geolocation permission query
        }
      }
    };

    void syncPermissionAndCoords();
    return () => {
      active = false;
    };
  }, [gpsEnabled]);

  const toggleGps = useCallback(async () => {
    if (gpsEnabled) {
      setGpsCoords(null);
      setGpsStatus('idle');
      setGpsEnabled(false);
      broadcastGpsChange(false);
      return;
    }

    setGpsStatus('locating');
    setGpsEnabled(true);
    broadcastGpsChange(true);

    try {
      const coords = await getCurrentLocation({ timeoutMs: 5000 });
      if (coords) {
        setGpsCoords({ lat: coords.lat, lng: coords.lng });
        setGpsStatus('ready');
      } else {
        setGpsStatus('error');
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'denied' || code === 'unsupported') {
        setGpsEnabled(false);
        setGpsStatus('denied');
        broadcastGpsChange(false);
      } else {
        setGpsStatus('error');
      }
    }
  }, [gpsEnabled]);

  const gpsSubtitle =
    gpsStatus === 'denied'
      ? 'Trình duyệt chưa cấp quyền GPS'
      : !gpsEnabled
        ? 'Đang tắt định vị tự động'
        : gpsStatus === 'locating'
          ? 'Đang lấy tọa độ GPS...'
          : gpsStatus === 'ready' && gpsCoords
            ? `Đang bật (${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)})`
            : gpsStatus === 'error'
              ? 'Chưa lấy được GPS · Dùng vị trí phường'
              : 'Tự động định vị hiện trường';

  return { gpsEnabled, gpsStatus, gpsSubtitle, toggleGps };
}
