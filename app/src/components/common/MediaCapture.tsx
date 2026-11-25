import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Folder, Square, Trash2, Video, X, Zap, ZapOff } from 'lucide-react';
import { compressImage } from '@/lib/image';
import {
  blobToMediaSource,
  formatDuration,
  getSupportedVideoMimeType,
  getVideoDurationSeconds,
  isVideoSource,
  MAX_IMAGE_SIZE_BYTES,
  MAX_MEDIA_ITEMS,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
} from '@/lib/media';

interface TorchMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

export interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCaptured: (mediaSrc: string) => void;
  currentCount: number;
  maxItems?: number;
  allowVideo?: boolean;
  title?: string;
}

/**
 * Modal camera trực tiếp (WebRTC) hỗ trợ chụp ảnh & quay video tối đa 5 phút.
 * Tự động fallback sang input camera gốc của thiết bị nếu trình duyệt không hỗ trợ / từ chối quyền.
 */
export function CameraCaptureModal({
  open,
  onClose,
  onCaptured,
  currentCount,
  maxItems = MAX_MEDIA_ITEMS,
  allowVideo = true,
  title = 'Chụp ảnh / Quay video tại chỗ',
}: CameraCaptureModalProps) {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [liveReady, setLiveReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setLiveReady(false);
    setIsRecording(false);
    setRecordingSeconds(0);
  }, [stopTimer]);

  const startCamera = useCallback(async (withAudio: boolean) => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraError('Trình duyệt không hỗ trợ mở camera trực tiếp. Bạn có thể dùng nút bên dưới.');
      setLiveReady(false);
      return;
    }

    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: withAudio,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setLiveReady(true);
    } catch {
      if (withAudio) {
        // Thử lại chỉ với video nếu mic bị từ chối
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          streamRef.current = videoOnly;
          if (videoRef.current) {
            videoRef.current.srcObject = videoOnly;
            await videoRef.current.play().catch(() => {});
          }
          setLiveReady(true);
          return;
        } catch {
          // fall through
        }
      }
      setLiveReady(false);
      setCameraError(
        'Chưa cấp quyền camera hoặc thiết bị không có camera trực tiếp. Hãy dùng nút chụp của thiết bị bên dưới.'
      );
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }
    void startCamera(mode === 'video');
    return () => {
      stopStream();
    };
  }, [open, mode, startCamera, stopStream]);

  const handleToggleFlash = async () => {
    const next = !flashOn;
    setFlashOn(next);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && typeof track.getCapabilities === 'function') {
      const caps = track.getCapabilities() as TorchMediaTrackCapabilities;
      if (caps.torch) {
        const constraint: TorchConstraintSet = { torch: next };
        await track.applyConstraints({ advanced: [constraint] }).catch(() => {});
      }
    }
  };

  const handleCapturePhoto = () => {
    if (currentCount >= maxItems) {
      setCameraError(`Đã đạt tối đa ${maxItems} mục (ảnh/video).`);
      return;
    }
    const video = videoRef.current;
    if (liveReady && video && video.videoWidth > 0 && video.videoHeight > 0) {
      const maxDim = 1280;
      let targetW = video.videoWidth;
      let targetH = video.videoHeight;
      if (targetW > maxDim || targetH > maxDim) {
        const ratio = Math.min(maxDim / targetW, maxDim / targetH);
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        setShutterFlash(true);
        window.setTimeout(() => setShutterFlash(false), 140);
        onCaptured(dataUrl);
        onClose();
        return;
      }
    }
    nativeCameraInputRef.current?.click();
  };

  const stopRecording = useCallback(() => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, [stopTimer]);

  const handleStartRecording = () => {
    if (currentCount >= maxItems) {
      setCameraError(`Đã đạt tối đa ${maxItems} mục (ảnh/video).`);
      return;
    }
    if (!streamRef.current || typeof MediaRecorder === 'undefined') {
      nativeCameraInputRef.current?.click();
      return;
    }

    setCameraError(null);
    chunksRef.current = [];
    const mimeType = getSupportedVideoMimeType();
    try {
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm',
        });
        chunksRef.current = [];
        if (blob.size === 0) return;
        setIsProcessing(true);
        blobToMediaSource(blob)
          .then((src) => {
            onCaptured(src);
            onClose();
          })
          .catch(() => {
            setCameraError('Không thể lưu video vừa quay. Vui lòng thử lại.');
          })
          .finally(() => {
            setIsProcessing(false);
          });
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_VIDEO_DURATION_SECONDS) {
            stopRecording();
            return MAX_VIDEO_DURATION_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch {
      nativeCameraInputRef.current?.click();
    }
  };

  const handleNativeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCameraError(null);
    setIsProcessing(true);
    try {
      if (file.type.startsWith('video/')) {
        if (!allowVideo) {
          setCameraError('Chế độ này chỉ hỗ trợ chụp ảnh.');
          return;
        }
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          setCameraError('Video vượt quá dung lượng tối đa 100MB.');
          return;
        }
        const duration = await getVideoDurationSeconds(file);
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          setCameraError('Video vượt quá thời lượng tối đa 5 phút.');
          return;
        }
        const src = await blobToMediaSource(file);
        onCaptured(src);
        onClose();
      } else if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          setCameraError('Ảnh vượt quá dung lượng tối đa 15MB.');
          return;
        }
        const compressed = await compressImage(file, 1280, 0.7);
        onCaptured(compressed.dataUrl);
        onClose();
      } else {
        setCameraError('Định dạng tệp không hợp lệ.');
      }
    } catch {
      setCameraError('Không thể xử lý tệp vừa chụp/quay.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0F172A] text-white shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-bold">{title}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
              {currentCount}/{maxItems}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFlash}
              aria-label={flashOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              {flashOn ? (
                <Zap className="h-4 w-4 text-amber-300" />
              ) : (
                <ZapOff className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng camera"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              liveReady ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Rule of thirds grid */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/10" />
            <div className="border-r border-b border-white/10" />
            <div className="border-b border-white/10" />
            <div className="border-r border-b border-white/10" />
            <div className="border-r border-b border-white/10" />
            <div className="border-b border-white/10" />
            <div className="border-r border-white/10" />
            <div className="border-r border-white/10" />
            <div />
          </div>

          {shutterFlash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}

          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-rose-600/95 px-3 py-1 text-xs font-bold shadow-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span>
                REC {formatDuration(recordingSeconds)} /{' '}
                {formatDuration(MAX_VIDEO_DURATION_SECONDS)}
              </span>
            </div>
          )}

          {!liveReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Camera className="h-10 w-10 text-sky-400 opacity-80" />
              <p className="max-w-sm text-xs text-slate-300">
                {cameraError || 'Đang khởi động camera...'}
              </p>
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600"
              >
                Mở camera thiết bị
              </button>
            </div>
          )}
        </div>

        {/* Hidden native capture input */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept={allowVideo ? 'image/*,video/*' : 'image/*'}
          capture="environment"
          onChange={handleNativeCapture}
          className="hidden"
          aria-label="Camera thiết bị"
        />

        {cameraError && liveReady && (
          <div className="flex items-center gap-2 bg-rose-950/80 px-4 py-2 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-3 bg-[#0B1120] px-4 py-4">
          {allowVideo && (
            <div className="inline-flex rounded-full bg-white/10 p-1 text-xs font-semibold">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setMode('photo')}
                className={`rounded-full px-3.5 py-1 transition-colors ${
                  mode === 'photo' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
                } disabled:opacity-50`}
              >
                Chụp ảnh
              </button>
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setMode('video')}
                className={`rounded-full px-3.5 py-1 transition-colors ${
                  mode === 'video' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'
                } disabled:opacity-50`}
              >
                Quay video (≤ 5 phút)
              </button>
            </div>
          )}

          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              disabled={isRecording || isProcessing}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20 disabled:opacity-40"
            >
              Camera máy
            </button>

            {mode === 'photo' ? (
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={isProcessing}
                aria-label="Chụp ảnh ngay"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/15 p-1 transition-transform active:scale-95 disabled:opacity-50"
              >
                <span className="h-full w-full rounded-full bg-white" />
              </button>
            ) : isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Dừng quay video"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-rose-400 bg-rose-600/30 transition-transform active:scale-95"
              >
                <Square className="h-6 w-6 fill-rose-500 text-rose-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isProcessing}
                aria-label="Bắt đầu quay video"
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-rose-600/20 p-1.5 transition-transform active:scale-95 disabled:opacity-50"
              >
                <span className="h-full w-full rounded-full bg-rose-500" />
              </button>
            )}

            <div className="w-20 text-right text-[11px] text-slate-400">
              {isProcessing ? 'Đang lưu...' : mode === 'video' ? 'Tối đa 5p' : 'Ảnh HD'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface MediaItemPreviewProps {
  src: string;
  alt: string;
  className?: string;
}

export function MediaItemPreview({
  src,
  alt,
  className = 'h-full w-full object-cover',
}: MediaItemPreviewProps) {
  if (isVideoSource(src)) {
    return <video src={src} controls playsInline preload="metadata" className={className} />;
  }
  return <img src={src} alt={alt} className={className} />;
}

export interface MediaCaptureFieldProps {
  items: string[];
  onChange: (nextItems: string[]) => void;
  maxItems?: number;
  allowGallery?: boolean;
  allowVideo?: boolean;
  captureLabel?: string;
  galleryLabel?: string;
  onAddSample?: () => void;
  sampleLabel?: string;
}

/**
 * Khối chụp ảnh / quay video tái sử dụng cho các form (Điều gì chưa ổn, TNV xác minh, Cán bộ kết quả, Tiếp nhận hộ).
 */
export function MediaCaptureField({
  items,
  onChange,
  maxItems = MAX_MEDIA_ITEMS,
  allowGallery = true,
  allowVideo = true,
  captureLabel = 'Chụp ảnh / Quay video',
  galleryLabel = 'Chọn từ thiết bị',
  onAddSample,
  sampleLabel = 'Dùng ảnh mẫu',
}: MediaCaptureFieldProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleCaptured = (mediaSrc: string) => {
    setErrorMsg(null);
    if (items.length >= maxItems) {
      setErrorMsg(`Tối đa ${maxItems} mục (ảnh/video).`);
      return;
    }
    onChange([...items, mediaSrc].slice(0, maxItems));
  };

  const handleGalleryFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);

    if (items.length >= maxItems) {
      setErrorMsg(`Tối đa ${maxItems} mục (ảnh/video).`);
      return;
    }

    const available = maxItems - items.length;
    const files = Array.from(fileList).slice(0, available);
    setIsProcessing(true);
    const added: string[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          setErrorMsg('Ảnh vượt quá dung lượng tối đa 15MB.');
          continue;
        }
        try {
          const res = await compressImage(file, 1280, 0.7);
          added.push(res.dataUrl);
        } catch {
          setErrorMsg('Không thể xử lý ảnh. Vui lòng thử ảnh khác.');
        }
      } else if (allowVideo && file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          setErrorMsg('Video vượt quá dung lượng tối đa 100MB.');
          continue;
        }
        try {
          const duration = await getVideoDurationSeconds(file);
          if (duration > MAX_VIDEO_DURATION_SECONDS) {
            setErrorMsg('Video vượt quá thời lượng tối đa 5 phút.');
            continue;
          }
          const src = await blobToMediaSource(file);
          added.push(src);
        } catch {
          setErrorMsg('Không thể đọc video. Vui lòng thử video khác.');
        }
      } else {
        setErrorMsg('Định dạng tệp không hợp lệ.');
      }
    }

    setIsProcessing(false);
    if (added.length > 0) {
      onChange([...items, ...added].slice(0, maxItems));
    }
  };

  return (
    <div className="space-y-2.5">
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {items.map((src, idx) => {
            const isVid = isVideoSource(src);
            return (
              <div
                key={`${idx}-${src.slice(0, 24)}`}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-900"
              >
                <MediaItemPreview src={src} alt={`Tệp đính kèm ${idx + 1}`} />
                {isVid && (
                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <Video className="h-3 w-3" /> Video
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  aria-label={`Xoá mục ${idx + 1}`}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-sm hover:bg-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {items.length < maxItems && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={isProcessing}
            className="inline-flex flex-1 min-w-[160px] items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5 px-4 py-3 text-xs font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span>{captureLabel}</span>
          </button>

          {allowGallery && (
            <>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              >
                <Folder className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                <span>{isProcessing ? 'Đang xử lý...' : galleryLabel}</span>
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept={allowVideo ? 'image/*,video/*' : 'image/*'}
                multiple
                onChange={(e) => {
                  void handleGalleryFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </>
          )}

          {onAddSample && (
            <button
              type="button"
              onClick={onAddSample}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-border)] px-3 py-3 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {sampleLabel}
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        Đã chọn {items.length}/{maxItems} mục • Hỗ trợ ảnh và video (tối đa 5 phút/video).
      </p>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleCaptured}
        currentCount={items.length}
        maxItems={maxItems}
        allowVideo={allowVideo}
        title={captureLabel}
      />
    </div>
  );
}
