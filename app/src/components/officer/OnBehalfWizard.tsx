import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  FileText,
  Folder,
  MapPin,
  Mic,
  MicOff,
  Phone,
  Plus,
  Search,
  Send,
  Square,
  Video,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { createOnBehalf } from '@/store/officerActions';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Category, Notification, Report } from '@/domain/types';
import { formatDate } from '@/domain/format';
import { STREETS, WARD_CENTER, nearestStreet } from '@/data/streets';
import { getCurrentLocation } from '@/lib/geolocation';
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
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { MediaItemPreview } from '@/components/common/MediaCapture';
import { SmsPreview } from '@/components/citizen/SmsPreview';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui';

interface OnBehalfWizardProps {
  isOpen: boolean;
  onClose: () => void;
  now: string;
}

interface TorchMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

const CATEGORY_ACCENT: Record<Category, string> = {
  den_duong: 'text-amber-600 dark:text-amber-400',
  ngap_nuoc: 'text-sky-600 dark:text-sky-400',
  rac_thai: 'text-emerald-600 dark:text-emerald-400',
  mat_duong: 'text-orange-600 dark:text-orange-400',
};

const MAX_TITLE_LENGTH = 90;
const MAX_DESCRIPTION_LENGTH = 300;

const CATEGORY_TITLE_SUGGESTIONS: Record<Category, readonly string[]> = {
  den_duong: ['Đèn đường không sáng', 'Bóng đèn chập chờn ban đêm', 'Trụ đèn chiếu sáng bị hỏng'],
  ngap_nuoc: ['Ngập nước sâu sau mưa', 'Cống thoát nước bị nghẹt', 'Nước đọng tràn mặt đường'],
  rac_thai: [
    'Rác thải ứ đọng trên vỉa hè',
    'Điểm tập kết rác bốc mùi',
    'Rác sinh hoạt tràn lòng đường',
  ],
  mat_duong: [
    'Ổ gà lớn gây nguy hiểm',
    'Mặt đường bong tróc, sụt lún',
    'Nắp hố ga bị lệch / hư hỏng',
  ],
};

const CATEGORY_DESC_PHRASES: Record<Category, readonly string[]> = {
  den_duong: [
    'Khu vực tối gây mất an toàn ban đêm',
    'Đã hỏng từ vài ngày nay',
    'Cần kiểm tra đường dây / bóng đèn',
  ],
  ngap_nuoc: [
    'Nước rút rất chậm gây cản trở xe cộ',
    'Rác che kín miệng cống thoát nước',
    'Ngập sâu mỗi khi có mưa lớn',
  ],
  rac_thai: [
    'Tồn đọng nhiều ngày chưa được thu gom',
    'Bốc mùi ảnh hưởng hộ dân xung quanh',
    'Tràn ra phần đường xe chạy',
  ],
  mat_duong: [
    'Nguy hiểm cho người đi xe máy ban đêm',
    'Nằm ngay giữa làn đường lưu thông',
    'Đọng nước dễ gây trượt ngã',
  ],
};

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function OnBehalfWizard({ isOpen, onClose, now }: OnBehalfWizardProps) {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'camera' | 'confirm' | 'success'>('camera');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Media / Camera state
  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [liveReady, setLiveReady] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Form fields
  const [category, setCategory] = useState<Category>('den_duong');
  const [lat, setLat] = useState(WARD_CENTER.lat);
  const [lng, setLng] = useState(WARD_CENTER.lng);
  const [address, setAddress] = useState(
    `Đ. ${STREETS[0]?.name ?? 'Cách Mạng Tháng Tám'}, P. Trấn Biên`
  );
  const [locatingGps, setLocatingGps] = useState(false);
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [formError, setFormError] = useState('');
  const [createdResult, setCreatedResult] = useState<{
    report: Report;
    notification: Notification;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraRef = useRef<HTMLInputElement | null>(null);

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

  const resetAll = useCallback(() => {
    stopStream();
    setPhase('camera');
    setStep(1);
    setPhotos([]);
    setActivePhotoIndex(0);
    setCaptureMode('photo');
    setMediaError(null);
    setCategory('den_duong');
    setLat(WARD_CENTER.lat);
    setLng(WARD_CENTER.lng);
    setAddress(`Đ. ${STREETS[0]?.name ?? 'Cách Mạng Tháng Tám'}, P. Trấn Biên`);
    setLocatingGps(false);
    setPhone('');
    setTitle('');
    setDescription('');
    setIsListeningVoice(false);
    setVoiceMessage(null);
    setFormError('');
    setCreatedResult(null);
  }, [stopStream]);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  useEffect(() => {
    if (!isOpen || phase !== 'camera') {
      stopStream();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setLiveReady(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: captureMode === 'video',
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setLiveReady(true);
      } catch {
        setLiveReady(false);
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, phase, captureMode, stopStream]);

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

  const stopRecording = useCallback(() => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, [stopTimer]);

  const handleShutter = () => {
    setMediaError(null);
    if (photos.length >= MAX_MEDIA_ITEMS) {
      setMediaError(`Tối đa ${MAX_MEDIA_ITEMS} mục (ảnh/video).`);
      return;
    }

    if (captureMode === 'video') {
      if (isRecording) {
        stopRecording();
        return;
      }
      if (!liveReady || !streamRef.current || typeof MediaRecorder === 'undefined') {
        nativeCameraRef.current?.click();
        return;
      }

      chunksRef.current = [];
      const mimeType = getSupportedVideoMimeType();
      try {
        const recorder = mimeType
          ? new MediaRecorder(streamRef.current, { mimeType })
          : new MediaRecorder(streamRef.current);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
          chunksRef.current = [];
          if (blob.size === 0) return;
          setIsProcessing(true);
          blobToMediaSource(blob)
            .then((src) => {
              setPhotos((prev) => {
                const next = [...prev, src].slice(0, MAX_MEDIA_ITEMS);
                setActivePhotoIndex(next.length - 1);
                return next;
              });
            })
            .catch(() => setMediaError('Không thể lưu video vừa quay.'))
            .finally(() => setIsProcessing(false));
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
        nativeCameraRef.current?.click();
      }
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
        setPhotos((prev) => {
          const next = [...prev, dataUrl].slice(0, MAX_MEDIA_ITEMS);
          setActivePhotoIndex(next.length - 1);
          return next;
        });
        return;
      }
    }
    nativeCameraRef.current?.click();
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setMediaError(null);
    const available = MAX_MEDIA_ITEMS - photos.length;
    if (available <= 0) {
      setMediaError(`Tối đa ${MAX_MEDIA_ITEMS} mục (ảnh/video).`);
      return;
    }

    setIsProcessing(true);
    const files = Array.from(fileList).slice(0, available);
    const added: string[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          setMediaError('Ảnh vượt quá 15MB.');
          continue;
        }
        try {
          const res = await compressImage(file, 1280, 0.7);
          added.push(res.dataUrl);
        } catch {
          setMediaError('Không thể đọc ảnh đã chọn.');
        }
      } else if (file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          setMediaError('Video vượt quá 100MB.');
          continue;
        }
        try {
          const dur = await getVideoDurationSeconds(file);
          if (dur > MAX_VIDEO_DURATION_SECONDS) {
            setMediaError('Video vượt quá 5 phút.');
            continue;
          }
          added.push(await blobToMediaSource(file));
        } catch {
          setMediaError('Không thể đọc video đã chọn.');
        }
      }
    }

    setIsProcessing(false);
    if (added.length > 0) {
      setPhotos((prev) => {
        const next = [...prev, ...added].slice(0, MAX_MEDIA_ITEMS);
        setActivePhotoIndex(next.length - 1);
        return next;
      });
    }
  };

  const handleMapTap = (tapLat: number, tapLng: number) => {
    setLat(tapLat);
    setLng(tapLng);
    const street = nearestStreet(tapLat, tapLng);
    setAddress(`Đ. ${street.name}, P. Trấn Biên`);
  };

  const handleLocateGps = async () => {
    setLocatingGps(true);
    try {
      const coords = await getCurrentLocation({ timeoutMs: 5000 });
      if (coords) {
        setLat(coords.lat);
        setLng(coords.lng);
        const street = nearestStreet(coords.lat, coords.lng);
        setAddress(`Đ. ${street.name}, P. Trấn Biên`);
      }
    } finally {
      setLocatingGps(false);
    }
  };

  const handleToggleVoice = () => {
    setVoiceMessage(null);
    if (isListeningVoice) {
      recognitionRef.current?.stop();
      setIsListeningVoice(false);
      return;
    }
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setVoiceMessage('Trình duyệt chưa hỗ trợ nhập giọng nói.');
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'vi-VN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setDescription((prev) =>
            (prev.trim() ? `${prev.trim()} ${transcript}` : transcript).slice(
              0,
              MAX_DESCRIPTION_LENGTH
            )
          );
        }
      };
      rec.onerror = () => {
        setIsListeningVoice(false);
        setVoiceMessage('Không nhận diện được giọng nói, vui lòng thử lại.');
      };
      rec.onend = () => {
        setIsListeningVoice(false);
      };
      recognitionRef.current = rec;
      rec.start();
      setIsListeningVoice(true);
    } catch {
      setIsListeningVoice(false);
      setVoiceMessage('Không thể khởi động micro.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!/^0\d{8,10}$/.test(cleanPhone)) {
      setFormError('Vui lòng nhập số điện thoại hợp lệ (bắt đầu bằng 0, 9-11 chữ số).');
      return;
    }
    if (!address.trim()) {
      setFormError('Vui lòng nhập hoặc chọn địa chỉ sự cố.');
      return;
    }

    const res = createOnBehalf(
      state,
      {
        phone: cleanPhone,
        category,
        lat,
        lng,
        address: address.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      },
      now
    );

    dispatch({
      type: 'ADD_REPORT',
      payload: { report: res.report, notification: res.notification },
    });
    setCreatedResult({ report: res.report, notification: res.notification });
    setFormError('');
    setPhase('success');
  };

  if (!isOpen) return null;

  if (phase === 'camera') {
    return (
      <div
        className="fixed inset-0 z-50 !mt-0 flex flex-col justify-between overflow-hidden bg-slate-950 text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Tạo phản ánh hộ - Chụp ảnh"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,248,0.16),transparent_48%),radial-gradient(circle_at_80%_75%,rgba(14,165,233,0.12),transparent_45%),linear-gradient(180deg,#111827_0%,#0B1120_100%)]"
        />

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
            className="pointer-events-none absolute inset-0 z-40 bg-white/85"
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

        {/* Top Bar matching C02Photo */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng tạo hộ"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <span className="text-base font-bold tracking-tight text-white drop-shadow-xs">
            Tạo phản ánh hộ
          </span>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setPhase('confirm');
            }}
            className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-[#0084E8]"
          >
            {photos.length > 0 ? `${photos.length}/${MAX_MEDIA_ITEMS} ảnh` : 'Bỏ qua ảnh →'}
          </button>
        </div>

        {mediaError && (
          <div className="relative z-20 mx-auto mt-2 w-full max-w-[430px] px-4">
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-red-400/50 bg-red-950/90 px-3.5 py-2.5 text-xs text-red-100 backdrop-blur-md"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <span>{mediaError}</span>
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

        <input
          ref={nativeCameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Bottom Controls matching C02Photo */}
        <div className="relative z-20 mx-auto flex w-full max-w-[430px] flex-col items-center gap-3 px-4 pb-6">
          {photos.length > 0 && (
            <div className="w-full rounded-[22px] border border-white/15 bg-[#0F172A]/85 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex flex-1 items-center gap-2 overflow-x-auto pt-1.5 pr-2 pb-0.5 no-scrollbar">
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`relative block h-[48px] w-[48px] overflow-hidden rounded-xl border-2 ${
                          idx === activePhotoIndex ? 'border-[#0084E8]' : 'border-white/25'
                        }`}
                      >
                        {isVideoSource(src) ? (
                          <video
                            src={src}
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={src}
                            alt={`Ảnh ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {isVideoSource(src) && (
                          <span className="pointer-events-none absolute top-1 left-1 rounded bg-black/75 p-0.5 text-white">
                            <Video className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Xoá ảnh ${idx + 1}`}
                        className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-rose-600 text-white shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setPhase('confirm');
                  }}
                  disabled={isProcessing}
                  className="inline-flex h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[#0084E8] px-4 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(0,132,232,0.38)] hover:bg-[#006EC4]"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="inline-flex rounded-full border border-white/15 bg-black/60 p-1 text-xs font-semibold backdrop-blur-md">
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setCaptureMode('photo')}
              className={`rounded-full px-3.5 py-1 transition ${
                captureMode === 'photo' ? 'bg-[#0084E8] text-white' : 'text-slate-200'
              }`}
            >
              Chụp ảnh
            </button>
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setCaptureMode('video')}
              className={`rounded-full px-3.5 py-1 transition ${
                captureMode === 'video' ? 'bg-rose-600 text-white' : 'text-slate-200'
              }`}
            >
              Quay video (≤ 5p)
            </button>
          </div>

          <div className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            {isProcessing
              ? 'Đang xử lý...'
              : captureMode === 'video'
                ? isRecording
                  ? 'Đang quay video hiện trường...'
                  : 'Nhấn nút đỏ để quay video (tối đa 5 phút)'
                : 'Đưa sự cố vào khung hình để chụp'}
          </div>

          <div className="flex h-[80px] w-[326px] max-w-full items-center justify-between rounded-[40px] border border-white/15 bg-[#141824]/90 px-6 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={handleToggleFlash}
              aria-label={flashOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                flashOn ? 'bg-amber-400/25 text-amber-300' : 'bg-white/10 text-white/90'
              }`}
            >
              {flashOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
            </button>

            {captureMode === 'photo' ? (
              <button
                type="button"
                onClick={handleShutter}
                disabled={isProcessing}
                aria-label="Chụp ảnh ngay"
                className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white bg-[#0084E8] shadow-[0_4px_18px_rgba(0,132,232,0.55)] transition hover:scale-105 active:scale-95"
              />
            ) : isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Dừng quay video"
                className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-rose-300 bg-rose-600/30 shadow-[0_4px_18px_rgba(225,29,72,0.55)]"
              >
                <Square className="h-6 w-6 fill-rose-500 text-rose-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleShutter}
                disabled={isProcessing}
                aria-label="Bắt đầu quay video"
                className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white bg-rose-600 shadow-[0_4px_18px_rgba(225,29,72,0.55)] transition hover:scale-105 active:scale-95"
              />
            )}

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isRecording || isProcessing}
              aria-label="Chọn từ thư viện"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20"
            >
              <Folder className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'success' && createdResult) {
    return (
      <div
        className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Đã tạo phản ánh hộ"
      >
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-[var(--color-surface)] p-6 shadow-2xl space-y-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="text-lg font-extrabold text-[var(--color-text)]">
                Đã tạo phản ánh hộ #{createdResult.report.id}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng"
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            Hồ sơ <strong>#{createdResult.report.id}</strong> đã được tiếp nhận (trạng thái:{' '}
            <strong>Đã tiếp nhận</strong>, hạn xử lý:{' '}
            <strong>{formatDate(createdResult.report.dueAt)}</strong>).
          </div>

          <SmsPreview
            phone={createdResult.report.reporterPhone || phone}
            message={createdResult.notification.message}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const targetId = createdResult.report.id;
                handleClose();
                navigate(`/can-bo/${targetId}`);
              }}
              className="bg-[#0084E8] text-white hover:bg-[#006EC4]"
            >
              Xem chi tiết hồ sơ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Phase === 'confirm' matching C04Confirm 100% on Mobile and PC
  const currentHero = photos[activePhotoIndex] ?? photos[0];
  const selectedCatCfg = CATEGORY_CONFIGS.find((c) => c.key === category) ?? CATEGORY_CONFIGS[0]!;
  const stepLabel =
    step === 1 ? 'Loại phản ánh' : step === 2 ? 'Vị trí phản ánh' : 'Mô tả & Liên hệ';

  const renderStepContent = (isMobile: boolean) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 3-Step Pill Bar matching C04Confirm */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
        {[
          { id: 1 as const, label: isMobile ? 'Phân loại' : 'Loại phản ánh' },
          { id: 2 as const, label: isMobile ? 'Vị trí' : 'Vị trí phản ánh' },
          { id: 3 as const, label: isMobile ? 'Mô tả' : 'Mô tả & Liên hệ' },
        ].map((item) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                active
                  ? 'bg-[#0084E8] text-white shadow-sm'
                  : done
                    ? 'bg-[#E6F3FD] text-[#0084E8] hover:bg-[#D0E8FC] dark:bg-sky-950/60 dark:text-[#38BDF8] dark:hover:bg-sky-900/70'
                    : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  active
                    ? 'bg-white text-[#0084E8]'
                    : done
                      ? 'bg-[#0084E8] text-white'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {done ? '✓' : item.id}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
        >
          {formError}
        </div>
      )}

      {/* Step 1: Loại phản ánh */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-[var(--color-text)]">
            Bước 1: Chọn loại phản ánh
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_CONFIGS.map((cfg) => {
              const selected = category === cfg.key;
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => setCategory(cfg.key)}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border p-4 text-center transition-all ${
                    selected
                      ? 'border-2 border-[#0084E8] bg-[#F0F8FF] shadow-xs dark:bg-sky-950/40'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0084E8] text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <CategoryIcon
                    category={cfg.key}
                    className={`h-6 w-6 ${CATEGORY_ACCENT[cfg.key]}`}
                  />
                  <div className="mt-1 text-sm font-extrabold text-[var(--color-text)]">
                    {cfg.label}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Xử lý trong {cfg.defaultDays} ngày
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4]"
          >
            <span>Tiếp tục chọn vị trí</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Vị trí (NO street dropdown, GPS button + Map + Address input matching C04Confirm) */}
      {step === 2 && (
        <div className="space-y-3.5">
          <button
            type="button"
            onClick={() => void handleLocateGps()}
            disabled={locatingGps}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] text-sm font-extrabold text-[#0084E8] transition hover:bg-[#E0F2FE] dark:border-sky-800 dark:bg-sky-950/40 dark:text-[#38BDF8]"
          >
            <Crosshair className="h-4 w-4" />
            <span>{locatingGps ? 'Đang lấy vị trí GPS...' : 'Lấy vị trí hiện tại (GPS)'}</span>
          </button>

          <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="pointer-events-none absolute top-3 left-3 z-[400] rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
              Chạm bản đồ để dời ghim
            </div>
            <MapView
              center={[lat, lng]}
              zoom={15}
              markers={[
                {
                  id: 'new-on-behalf',
                  lat,
                  lng,
                  category,
                  status: 'da_tiep_nhan',
                  title: address,
                },
              ]}
              onTap={handleMapTap}
              autoLocateUser={false}
              showLocateButton={false}
              hideBuiltInLegend={true}
              className="h-full w-full"
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">Địa chỉ</span>
              <span className="text-[11px] text-slate-400">Nhập tìm hoặc chạm bản đồ</span>
            </div>
            <div className="relative flex items-center">
              <Search className="pointer-events-none h-4 w-4 shrink-0 text-[#0084E8]" />
              <input
                id={isMobile ? 'on-behalf-address-m' : 'on-behalf-address-d'}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, tên đường, khu phố..."
                required
                className="w-full bg-transparent px-2.5 py-1 text-sm font-bold text-[var(--color-text)] focus:outline-none"
              />
              {address && (
                <button
                  type="button"
                  onClick={() => setAddress('')}
                  aria-label="Xoá địa chỉ"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200/60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] hover:bg-[#006EC4]"
          >
            <span>Xác nhận vị trí</span>
          </button>
        </div>
      )}

      {/* Step 3: Mô tả & Liên hệ (cloned from C04Confirm + Số điện thoại người nhờ tạo hộ) */}
      {step === 3 && (
        <div className="space-y-4">
          {isMobile && (
            <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F3FD]">
                    <CategoryIcon
                      category={category}
                      className={`h-4 w-4 ${CATEGORY_ACCENT[category]}`}
                    />
                  </span>
                  <span className="truncate font-bold text-[var(--color-text)]">
                    {selectedCatCfg.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="shrink-0 rounded-full bg-[#E6F3FD] px-2.5 py-1 text-[11px] font-bold text-[#0084E8]"
                >
                  Đổi loại
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F3FD] text-[#0084E8]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="truncate font-bold text-[var(--color-text)]">
                    {address || 'Chưa chọn vị trí'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="shrink-0 rounded-full bg-[#E6F3FD] px-2.5 py-1 text-[11px] font-bold text-[#0084E8]"
                >
                  Đổi vị trí
                </button>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-base font-extrabold text-[var(--color-text)]">
              Mô tả &amp; Liên hệ
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Giúp Cán bộ, Tình nguyện viên và Cộng đồng nắm rõ hiện trạng nhanh nhất
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-4 space-y-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-text)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F3FD] text-[#0084E8]">
                <FileText className="h-4 w-4" />
              </span>
              <span>Nội dung sự cố</span>
            </div>

            {/* Tiêu đề phản ánh */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={isMobile ? 'on-behalf-title-m' : 'on-behalf-title-d'}
                  className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500"
                >
                  Tiêu đề phản ánh
                </label>
                <span className="text-[11px] text-slate-400">
                  {title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
              <input
                id={isMobile ? 'on-behalf-title-m' : 'on-behalf-title-d'}
                type="text"
                maxLength={MAX_TITLE_LENGTH}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`VD: ${CATEGORY_TITLE_SUGGESTIONS[category][0]}...`}
                className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] placeholder:text-slate-400 focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none dark:border-slate-700 dark:bg-slate-900/60"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Gợi ý:</span>
                {CATEGORY_TITLE_SUGGESTIONS[category].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTitle(sug.slice(0, MAX_TITLE_LENGTH))}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#0084E8]/50 hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Mô tả chi tiết hiện trạng + Nhập giọng nói */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor={isMobile ? 'on-behalf-desc-m' : 'on-behalf-desc-d'}
                  className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500"
                >
                  Mô tả chi tiết hiện trạng
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      isListeningVoice
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0084E8] hover:bg-[#E0F2FE]'
                    }`}
                  >
                    {isListeningVoice ? (
                      <>
                        <MicOff className="h-3 w-3" />
                        <span>Đang nghe...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3" />
                        <span>Nhập giọng nói</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {voiceMessage && <p className="text-[11px] text-amber-700">{voiceMessage}</p>}
              <textarea
                id={isMobile ? 'on-behalf-desc-m' : 'on-behalf-desc-d'}
                rows={3}
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết hiện trạng sự cố hoặc bấm 'Nhập giọng nói' để đọc..."
                className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-slate-400 focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none dark:border-slate-700 dark:bg-slate-900/60"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Gợi ý:</span>
                {CATEGORY_DESC_PHRASES[category].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() =>
                      setDescription((prev) =>
                        (prev.trim() ? `${prev.trim()}. ${phrase}` : phrase).slice(
                          0,
                          MAX_DESCRIPTION_LENGTH
                        )
                      )
                    }
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#0084E8]/50 hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Số điện thoại người nhờ tạo phản ánh hộ */}
            <div>
              <label
                htmlFor={isMobile ? 'on-behalf-phone-m' : 'on-behalf-phone-d'}
                className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500"
              >
                Số điện thoại người nhờ tạo phản ánh hộ *
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0084E8]" />
                <input
                  id={isMobile ? 'on-behalf-phone-m' : 'on-behalf-phone-d'}
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFormError('');
                  }}
                  placeholder="Ví dụ: 0909000123"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] py-2.5 pl-10 pr-4 text-sm font-semibold text-[var(--color-text)] focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none dark:border-slate-700 dark:bg-slate-900/60"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4]"
          >
            <Send className="h-4 w-4" />
            <span>Tiếp nhận &amp; tạo hồ sơ</span>
          </button>
        </div>
      )}
    </form>
  );

  return (
    <div
      className="fixed inset-0 z-50 !mt-0 flex flex-col overflow-y-auto bg-[var(--color-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label="Hoàn tất & Gửi phản ánh hộ"
    >
      {/* MOBILE VIEW (< md): Overlaid dark photo + rounded-t-[28px] bottom sheet matching Image 8 */}
      <div className="flex flex-1 flex-col md:hidden">
        <div className="relative h-[34vh] min-h-[220px] w-full shrink-0 bg-slate-950">
          {currentHero ? (
            <MediaItemPreview src={currentHero} alt="Ảnh hiện trường tạo hộ" />
          ) : (
            <button
              type="button"
              onClick={() => setPhase('camera')}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs font-bold text-slate-300"
            >
              <Plus className="h-6 w-6" />
              <span>Chưa có ảnh · Nhấn để chụp ảnh</span>
            </button>
          )}

          {/* Overlaid Mobile Header */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-3">
            <button
              type="button"
              onClick={() => setPhase('camera')}
              aria-label="Quay lại chụp ảnh"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold text-white drop-shadow-sm">Xác nhận gửi hộ</span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md"
            >
              {photos.length}/{MAX_MEDIA_ITEMS} ảnh
            </button>
          </div>

          {/* Overlaid Thumbnail Strip */}
          <div className="absolute bottom-7 left-4 z-10 flex items-center gap-2">
            {photos.map((src, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIndex(idx)}
                className={`h-11 w-11 overflow-hidden rounded-xl border-2 bg-slate-900 ${
                  idx === activePhotoIndex ? 'border-[#0084E8]' : 'border-white/40'
                }`}
              >
                {isVideoSource(src) ? (
                  <video src={src} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={src} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                )}
              </button>
            ))}
            {photos.length < MAX_MEDIA_ITEMS && (
              <button
                type="button"
                onClick={() => setPhase('camera')}
                aria-label="Thêm ảnh"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-black/45 text-white backdrop-blur-md"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative z-20 -mt-5 flex-1 rounded-t-[28px] bg-[var(--color-surface)] px-4 pt-3 pb-8 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          {renderStepContent(true)}
        </div>
      </div>

      {/* DESKTOP / TABLET VIEW (>= md): Exact C04Confirm 12-col Layout (Images 1, 3, 5) */}
      <div className="hidden md:flex md:flex-1 md:flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[var(--color-surface)] px-6 py-3 dark:border-slate-800">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPhase('camera')}
                aria-label="Quay lại chụp ảnh"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[var(--color-text)] hover:bg-slate-200 dark:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-[var(--color-text)]">
                  Hoàn tất &amp; Gửi phản ánh hộ
                </h1>
                <p className="text-xs text-slate-500">
                  Bước {step}/3 · {stepLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#E6F3FD] px-3 py-1 text-xs font-extrabold text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                {photos.length}/{MAX_MEDIA_ITEMS} ảnh đính kèm
              </span>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Huỷ tạo hộ"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl flex-1 px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Media + TÓM TẮT HỒ SƠ ĐANG TẠO */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-sm space-y-4 dark:border-slate-800">
              {currentHero ? (
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950">
                  <MediaItemPreview src={currentHero} alt="Ảnh hiện trường tạo hộ" />
                  <span className="absolute top-3 right-3 rounded-full bg-black/65 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    Ảnh #{activePhotoIndex + 1}/{photos.length}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhase('camera')}
                  className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs font-bold text-slate-500 hover:border-[#0084E8] hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-900"
                >
                  <Plus className="h-6 w-6" />
                  <span>Chưa có ảnh · Nhấn để chụp hoặc chọn ảnh</span>
                </button>
              )}

              <div className="flex items-center gap-2 overflow-x-auto pt-2 pr-2 pb-1 no-scrollbar">
                {photos.map((src, idx) => (
                  <div key={idx} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      aria-label={`Xem ảnh ${idx + 1}`}
                      className={`h-12 w-12 overflow-hidden rounded-xl border-2 ${
                        idx === activePhotoIndex
                          ? 'border-[#0084E8]'
                          : 'border-transparent opacity-80'
                      }`}
                    >
                      {isVideoSource(src) ? (
                        <video src={src} muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        <img
                          src={src}
                          alt={`Ảnh ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = photos.filter((_, i) => i !== idx);
                        setPhotos(next);
                        setActivePhotoIndex((prev) => Math.max(0, Math.min(prev, next.length - 1)));
                      }}
                      aria-label={`Xoá ảnh ${idx + 1}`}
                      className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_MEDIA_ITEMS && (
                  <button
                    type="button"
                    onClick={() => setPhase('camera')}
                    aria-label="Thêm ảnh / video"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-[#0084E8] hover:text-[#0084E8] dark:border-slate-700"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* TÓM TẮT HỒ SƠ ĐANG TẠO matching C04Confirm */}
              <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    TÓM TẮT HỒ SƠ ĐANG TẠO
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                    Bước {step}/3
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-[var(--color-surface)] px-3 py-2.5 text-xs dark:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F3FD]">
                      <CategoryIcon
                        category={category}
                        className={`h-4 w-4 ${CATEGORY_ACCENT[category]}`}
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-slate-400">
                        1. Loại phản ánh
                      </div>
                      <div className="truncate font-extrabold text-[var(--color-text)]">
                        {selectedCatCfg.label}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="font-bold text-[#0084E8] hover:underline"
                  >
                    Sửa
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-[var(--color-surface)] px-3 py-2.5 text-xs dark:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F3FD] text-[#0084E8]">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-slate-400">
                        2. Vị trí hiện trường
                      </div>
                      <div className="truncate font-extrabold text-[var(--color-text)]">
                        {address || 'Chưa chọn vị trí'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="font-bold text-[#0084E8] hover:underline"
                  >
                    Sửa
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Stepper + Form */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-6 shadow-sm dark:border-slate-800">
              {renderStepContent(false)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
