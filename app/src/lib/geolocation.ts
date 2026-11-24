export type GeolocationErrorCode = 'denied' | 'timeout' | 'unavailable' | 'unsupported';

export class GeolocationError extends Error {
  code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
  }
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationOptions {
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
}

/**
 * Lấy toạ độ GPS hiện tại qua Web Geolocation API (spec 7, UT-035.1)
 * Mặc định timeout 10s; phân loại lỗi rõ ràng bằng tiếng Việt
 */
export function getCurrentLocation(options?: GeolocationOptions): Promise<Coordinates> {
  const timeoutMs = options?.timeoutMs ?? 10000;
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(
        new GeolocationError('unsupported', 'Trình duyệt không hỗ trợ dịch vụ định vị.')
      );
    }

    let isSettled = false;
    const timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      reject(
        new GeolocationError(
          'timeout',
          'Quá thời gian lấy vị trí (10 giây). Bạn bật định vị hoặc gõ tên đường nhé.'
        )
      );
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);

        if (err.code === 1) {
          // PERMISSION_DENIED
          reject(
            new GeolocationError(
              'denied',
              'Chưa lấy được vị trí do quyền truy cập bị từ chối. Bạn bật định vị hoặc gõ tên đường nhé.'
            )
          );
        } else if (err.code === 3) {
          // TIMEOUT
          reject(
            new GeolocationError(
              'timeout',
              'Quá thời gian lấy vị trí. Bạn bật định vị hoặc gõ tên đường nhé.'
            )
          );
        } else {
          // POSITION_UNAVAILABLE
          reject(
            new GeolocationError(
              'unavailable',
              'Không thể xác định vị trí hiện tại. Bạn bật định vị hoặc gõ tên đường nhé.'
            )
          );
        }
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: 10000,
      }
    );
  });
}
