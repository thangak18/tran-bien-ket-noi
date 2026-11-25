import { useEffect, useMemo, useState } from 'react';
import { getMyReports } from '../domain/access';
import { Report } from '../domain/types';
import { useAppStore } from '../store/AppStore';
import { isApiMode } from './index';
import { useDataSource } from './useDataSource';

/**
 * Hồ sơ của người dân đang dùng thiết bị (SĐT đã đăng nhập hoặc hồ sơ lưu trên máy).
 * - local: lọc từ store theo SĐT / deviceReports.
 * - api: danh sách công khai không có SĐT người gửi, nên hỏi máy chủ (/citizen/me/reports).
 */
export function useMyReports(): Report[] {
  const { state } = useAppStore();
  const ds = useDataSource();
  const apiMode = isApiMode();
  const [apiReports, setApiReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    ds.getMyReports()
      .then((list) => {
        if (!cancelled) setApiReports(list);
      })
      .catch(() => {
        if (!cancelled) setApiReports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, ds, state.settings.phone, state.reports]);

  const localReports = useMemo(
    () =>
      apiMode
        ? []
        : getMyReports(state.reports, {
            phone: state.settings.phone,
            deviceReports: state.settings.deviceReports,
          }),
    [apiMode, state.reports, state.settings.phone, state.settings.deviceReports]
  );

  return apiMode ? apiReports : localReports;
}
