import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Folder, QrCode, Search, ZapOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function parseReportQrPayload(raw: string): { id: string; key?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Match URL like https://.../phan-anh/TB-0001?k=1234 or /phan-anh/TB-0001
  const idMatch = trimmed.match(/TB-\d+/i);
  if (!idMatch) return null;
  const id = idMatch[0].toUpperCase();

  const keyMatch = trimmed.match(/[?&]k=(\d{4})/i);
  return {
    id,
    key: keyMatch?.[1],
  };
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [manualInput, setManualInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setErrorMsg(null);
      setManualInput('');
    }
    return () => stopCamera();
  }, [isOpen]);

  const navigateToParsed = (raw: string): boolean => {
    const parsed = parseReportQrPayload(raw);
    if (!parsed) {
      setErrorMsg('Không nhận diện được mã phản ánh (ví dụ: TB-0001 hoặc link phản ánh).');
      return false;
    }
    stopCamera();
    onClose();
    navigate(parsed.key ? `/phan-anh/${parsed.id}?k=${parsed.key}` : `/phan-anh/${parsed.id}`);
    return true;
  };

  const handleStartCamera = async () => {
    setErrorMsg(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Thiết bị không hỗ trợ camera trực tiếp. Bạn có thể chọn ảnh QR hoặc dán mã.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts?: { formats?: string[] }) => {
            detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;

      if (BarcodeDetectorCtor && videoRef.current) {
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const scanTick = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue && navigateToParsed(codes[0].rawValue)) {
              return;
            }
          } catch {
            // ignore frame decode errors
          }
          if (streamRef.current) {
            window.requestAnimationFrame(() => void scanTick());
          }
        };
        window.requestAnimationFrame(() => void scanTick());
      }
    } catch {
      setErrorMsg('Không thể mở camera. Vui lòng cấp quyền hoặc chọn ảnh QR / dán mã bên dưới.');
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts?: { formats?: string[] }) => {
          detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;

    if (BarcodeDetectorCtor && typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const codes = await detector.detect(bitmap);
        if (codes[0]?.rawValue) {
          navigateToParsed(codes[0].rawValue);
          return;
        }
      } catch {
        // fallback below
      }
    }

    const fromName = parseReportQrPayload(file.name);
    if (fromName) {
      navigateToParsed(file.name);
      return;
    }

    setErrorMsg(
      'Chưa đọc được mã QR từ ảnh này. Bạn hãy dán link theo dõi hoặc nhập mã TB-xxxx bên dưới.'
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    navigateToParsed(manualInput);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quét mã QR phản ánh">
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-xs text-[var(--color-text-muted)]">
          Đưa mã QR phản ánh vào khung camera, chọn ảnh QR có sẵn hoặc nhập mã hồ sơ để mở nhanh
          trang theo dõi.
        </div>

        {/* Fullscreen Camera Scanner View matching C02Photo or Unified Action Button */}
        {cameraActive && (
          <div
            className="fixed inset-0 z-[60] !mt-0 flex flex-col justify-between overflow-hidden bg-slate-950 text-white"
            role="dialog"
            aria-modal="true"
            aria-label="Quét mã QR phản ánh"
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
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />

            {/* Top Bar */}
            <div className="relative z-20 flex items-center justify-between px-4 pt-4">
              <button
                type="button"
                onClick={stopCamera}
                aria-label="Đóng camera quét"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="text-base font-bold tracking-tight text-white drop-shadow-xs">
                Quét mã QR
              </span>
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                QR
              </span>
            </div>

            {/* Center 4 White Rounded Corner Brackets */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center px-6 py-6">
              <div className="relative flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center">
                <span className="absolute top-0 left-0 h-11 w-11 rounded-tl-2xl border-t-[3.5px] border-l-[3.5px] border-white drop-shadow-sm" />
                <span className="absolute top-0 right-0 h-11 w-11 rounded-tr-2xl border-t-[3.5px] border-r-[3.5px] border-white drop-shadow-sm" />
                <span className="absolute bottom-0 left-0 h-11 w-11 rounded-bl-2xl border-b-[3.5px] border-l-[3.5px] border-white drop-shadow-sm" />
                <span className="absolute right-0 bottom-0 h-11 w-11 rounded-br-2xl border-r-[3.5px] border-b-[3.5px] border-white drop-shadow-sm" />
              </div>
            </div>

            {/* Bottom Dock */}
            <div className="relative z-20 mx-auto flex w-full max-w-[430px] flex-col items-center gap-3 px-4 pb-6">
              <div className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                Đưa mã QR vào khung hình để quét
              </div>
              <div className="flex h-[80px] w-[326px] max-w-full items-center justify-between rounded-[40px] border border-white/15 bg-[#141824]/90 px-6 shadow-2xl backdrop-blur-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/60">
                  <ZapOff className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white bg-[#0084E8] shadow-[0_4px_18px_rgba(0,132,232,0.55)]">
                  <QrCode className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  aria-label="Chọn ảnh QR từ thiết bị"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20"
                >
                  <Folder className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleStartCamera()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5 px-4 py-3.5 text-xs font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
        >
          <Camera className="h-4 w-4 shrink-0" />
          <span>Mở camera quét / Chọn ảnh QR</span>
        </button>
        <input
          ref={qrFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileScan}
          className="sr-only"
          aria-label="Chọn ảnh QR"
        />

        {errorMsg && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {errorMsg}
          </div>
        )}

        {/* Manual Code / URL Fallback */}
        <form
          onSubmit={handleManualSubmit}
          className="space-y-2 pt-1 border-t border-[var(--color-border)]"
        >
          <label
            htmlFor="qr-manual-input"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Hoặc nhập mã / dán link phản ánh</span>
          </label>
          <div className="flex gap-2">
            <input
              id="qr-manual-input"
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="VD: TB-0001 hoặc link /phan-anh/..."
              className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Search className="h-3.5 w-3.5" />}
            >
              Mở
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
