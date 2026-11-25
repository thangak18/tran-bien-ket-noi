import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, QrCode, Search } from 'lucide-react';
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

        {/* Camera Viewport or Action Buttons */}
        {cameraActive ? (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-36 w-36 rounded-2xl border-2 border-[#38BDF8] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="absolute bottom-2.5 right-2.5 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white"
            >
              Tắt camera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleStartCamera}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)]"
            >
              <Camera className="h-5 w-5 text-[var(--color-primary)]" />
              <span>Mở camera quét</span>
            </button>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)]">
              <ImageIcon className="h-5 w-5 text-[var(--color-primary)]" />
              <span>Chọn ảnh QR</span>
              <input type="file" accept="image/*" onChange={handleFileScan} className="sr-only" />
            </label>
          </div>
        )}

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
