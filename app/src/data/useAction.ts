import { useCallback, useEffect, useRef, useState } from 'react';
import { describeActionError, DescribedError } from '../lib/errors';
import { useAppStore } from '../store/AppStore';

export interface RunOptions {
  /** Gọi khi API trả 409 (dữ liệu đã đổi) để màn hình tải lại hồ sơ đang xem. */
  onConflict?: () => void | Promise<void>;
}

/**
 * Chạy một thao tác ghi dữ liệu với trạng thái đang xử lý và lỗi tiếng Việt.
 * Sau khi thành công ở chế độ API, danh sách trong store được đồng bộ lại.
 * Trả về kết quả của thao tác, hoặc undefined nếu thất bại (lỗi nằm ở `error`).
 */
export function useAction() {
  const { refresh } = useAppStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T>(fn: () => Promise<T>, options?: RunOptions): Promise<T | undefined> => {
      setPending(true);
      setError(null);
      try {
        const value = await fn();
        await refresh?.();
        return value;
      } catch (err) {
        const described: DescribedError = describeActionError(err);
        if (described.kind === 'conflict') {
          try {
            await options?.onConflict?.();
            await refresh?.();
          } catch {
            /* tải lại thất bại: vẫn báo lỗi gốc */
          }
        }
        if (mounted.current) setError(described.message);
        return undefined;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [refresh]
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, setError, clearError };
}
