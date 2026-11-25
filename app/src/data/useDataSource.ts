import { useMemo, useRef } from 'react';
import { useAppStore } from '../store/AppStore';
import { DataSource } from './DataSource';
import { LocalDataSource } from './LocalDataSource';
import { apiDataSource, isApiMode } from './index';

/**
 * Nguồn dữ liệu cho màn hình, chọn theo VITE_DATA_SOURCE:
 * - api: ApiDataSource (mọi thao tác ghi gọi API);
 * - local: LocalDataSource đọc/ghi trực tiếp AppStore (offline, mô phỏng).
 */
export function useDataSource(): DataSource {
  const { state, dispatch } = useAppStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  return useMemo(() => {
    if (isApiMode()) return apiDataSource;
    return new LocalDataSource(undefined, undefined, {
      get: () => stateRef.current,
      set: (next) => {
        // Cập nhật ngay để thao tác liên tiếp trong cùng một lượt render không đọc state cũ.
        stateRef.current = next;
        dispatch({ type: 'HYDRATE', payload: next });
      },
    });
  }, [dispatch]);
}
