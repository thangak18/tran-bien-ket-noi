export const MAX_MEDIA_ITEMS = 5;
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_DURATION_SECONDS = 300; // 5 phút

export function isVideoSource(src: string): boolean {
  if (!src) return false;
  return (
    src.startsWith('data:video/') ||
    src.startsWith('blob:') ||
    /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(src)
  );
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getVideoDurationSeconds(file: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Không thể đọc thông tin video.'));
    };

    video.src = url;
  });
}

export function blobToMediaSource(blob: Blob): Promise<string> {
  // Với video lớn (> 12MB), dùng ObjectURL để tránh tràn bộ nhớ/localStorage
  if (blob.size > 12 * 1024 * 1024 && typeof URL.createObjectURL === 'function') {
    return Promise.resolve(URL.createObjectURL(blob));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không thể đọc dữ liệu media.'));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc dữ liệu media.'));
    reader.readAsDataURL(blob);
  });
}

export function getSupportedVideoMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}
