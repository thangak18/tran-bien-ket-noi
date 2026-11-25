import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Folder,
  Square,
  Trash2,
  Video,
  Zap,
  ZapOff,
} from 'lucide-react';
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
  onSelectFiles?: (files: FileList | null) => void;
  currentCount: number;
  maxItems?: number;
  allowVideo?: boolean;
  allowGallery?: boolean;
  title?: string;
}

/**
 * Modal camera trực tiếp (WebRTC) giao diện toàn màn hình giống C02Photo, hỗ trợ chụp ảnh & quay video tối đa 5 phút.
 */
export function CameraCaptureModal({
  open,
  onClose,
  onCaptured,
  onSelectFiles,
  currentCount,
  maxItems = MAX_MEDIA_ITEMS,
  allowVideo = true,
  allowGallery = true,
  title = 'Chụp phản ánh',
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
  const modalGalleryInputRef = useRef<HTMLInputElement | null>(null);

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

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] !mt-0 flex flex-col justify-between overflow-hidden bg-slate-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Crisp Studio Camera Viewfinder Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.16),transparent_48%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.12),transparent_45%),linear-gradient(180deg,#111827_0%,#0B1120_100%)]"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: '33.333% 33.333%',
          }}
        />
      </div>

      {/* Live WebRTC Camera Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          liveReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {shutterFlash && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 bg-white/85 transition-opacity"
        />
      )}

      {isRecording && (
        <div className="absolute top-16 left-4 z-30 flex items-center gap-2 rounded-full bg-rose-600/95 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          <span>
            REC {formatDuration(recordingSeconds)} / {formatDuration(MAX_VIDEO_DURATION_SECONDS)}
          </span>
        </div>
      )}

      {/* Top Bar: [←]  [Chụp phản ánh]  [0/5 ảnh] */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng camera"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <span className="text-base font-bold tracking-tight text-white drop-shadow-xs">
          {title}
        </span>

        <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
          {currentCount}/{maxItems} ảnh
        </span>
      </div>

      {/* Error Banner */}
      {cameraError && (
        <div className="relative z-20 mx-auto mt-2 w-full max-w-[430px] px-4">
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-400/50 bg-red-950/90 px-3.5 py-2.5 text-xs text-red-100 backdrop-blur-md"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
            <span>{cameraError}</span>
          </div>
        </div>
      )}

      {/* Center 4 White Rounded Corner Brackets */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center px-6 py-6">
        <div className="relative flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center">
          <span className="absolute top-0 left-0 h-11 w-11 rounded-tl-2xl border-t-[3.5px] border-l-[3.5px] border-white drop-shadow-sm" />
          <span className="absolute top-0 right-0 h-11 w-11 rounded-tr-2xl border-t-[3.5px] border-r-[3.5px] border-white drop-shadow-sm" />
          <span className="absolute bottom-0 left-0 h-11 w-11 rounded-bl-2xl border-b-[3.5px] border-l-[3.5px] border-white drop-shadow-sm" />
          <span className="absolute right-0 bottom-0 h-11 w-11 rounded-br-2xl border-r-[3.5px] border-b-[3.5px] border-white drop-shadow-sm" />
        </div>
      </div>

      {/* Hidden native capture & gallery inputs */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept={allowVideo ? 'image/*,video/*' : 'image/*'}
        capture="environment"
        onChange={handleNativeCapture}
        className="hidden"
        aria-label="Camera thiết bị"
      />
      <input
        ref={modalGalleryInputRef}
        type="file"
        accept={allowVideo ? 'image/*,video/*' : 'image/*'}
        multiple
        onChange={(e) => {
          onSelectFiles?.(e.target.files);
          e.target.value = '';
          onClose();
        }}
        className="hidden"
        aria-label="Chọn từ thư viện thiết bị"
      />

      {/* Bottom Controls matching C02Photo */}
      <div className="relative z-20 mx-auto flex w-full max-w-[430px] flex-col items-center gap-3 px-4 pb-6">
        {allowVideo && (
          <div className="inline-flex rounded-full border border-white/15 bg-black/60 p-1 text-xs font-semibold backdrop-blur-md">
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setMode('photo')}
              className={`rounded-full px-3.5 py-1 transition ${
                mode === 'photo'
                  ? 'bg-[#0084E8] text-white shadow-sm'
                  : 'text-slate-200 hover:text-white'
              } disabled:opacity-50`}
            >
              Chụp ảnh
            </button>
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setMode('video')}
              className={`rounded-full px-3.5 py-1 transition ${
                mode === 'video'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-200 hover:text-white'
              } disabled:opacity-50`}
            >
              Quay video (≤ 5p)
            </button>
          </div>
        )}

        {/* Guide Pill */}
        <div className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          {isProcessing
            ? 'Đang lưu tệp...'
            : mode === 'video'
              ? isRecording
                ? 'Đang quay video hiện trường...'
                : 'Nhấn nút đỏ để quay video (tối đa 5 phút)'
              : 'Đưa sự cố vào khung hình để chụp'}
        </div>

        {/* Symmetric Pill Dock: [Flash]  [Shutter / Record]  [Folder] */}
        <div className="flex h-[80px] w-[326px] max-w-full items-center justify-between rounded-[40px] border border-white/15 bg-[#141824]/90 px-6 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={handleToggleFlash}
            aria-label={flashOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
            aria-pressed={flashOn}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
              flashOn
                ? 'bg-amber-400/25 text-amber-300'
                : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            {flashOn ? (
              <Zap className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ZapOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {mode === 'photo' ? (
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={isProcessing}
              aria-label="Chụp ảnh ngay"
              className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white bg-[#0084E8] shadow-[0_4px_18px_rgba(0,132,232,0.55)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
            />
          ) : isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Dừng quay video"
              className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-rose-300 bg-rose-600/30 shadow-[0_4px_18px_rgba(225,29,72,0.55)] transition hover:scale-105 active:scale-95"
            >
              <Square className="h-6 w-6 fill-rose-500 text-rose-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={isProcessing}
              aria-label="Bắt đầu quay video"
              className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white bg-rose-600 shadow-[0_4px_18px_rgba(225,29,72,0.55)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
            />
          )}

          {allowGallery ? (
            <button
              type="button"
              onClick={() => modalGalleryInputRef.current?.click()}
              disabled={isRecording || isProcessing}
              aria-label="Chọn ảnh / video từ thiết bị"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20 disabled:opacity-40"
            >
              <Folder className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <div className="h-11 w-11" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
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
}: MediaCaptureFieldProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={isProcessing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5 px-4 py-3 text-xs font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
        >
          <Camera className="h-4 w-4 shrink-0" />
          <span>{isProcessing ? 'Đang xử lý...' : captureLabel}</span>
        </button>
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
        onSelectFiles={(files) => {
          void handleGalleryFiles(files);
        }}
        currentCount={items.length}
        maxItems={maxItems}
        allowVideo={allowVideo}
        allowGallery={allowGallery}
        title="Chụp phản ánh"
      />
    </div>
  );
}
