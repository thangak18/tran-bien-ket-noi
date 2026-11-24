import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Share2, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shareOrCopy, buildTrackingUrl } from '@/lib/share';

export interface TrackingLinkCardProps {
  reportId: string;
  secretCode: string;
  origin?: string;
  showSecretDefault?: boolean;
  onCopySuccess?: () => void;
  className?: string;
}

export const TrackingLinkCard: React.FC<TrackingLinkCardProps> = ({
  reportId,
  secretCode,
  origin,
  showSecretDefault = true,
  onCopySuccess,
  className = '',
}) => {
  const [showSecret, setShowSecret] = useState(showSecretDefault);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const trackingUrl = buildTrackingUrl(reportId, secretCode, origin);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(trackingUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Lỗi sinh mã QR:', err);
      });

    return () => {
      active = false;
    };
  }, [trackingUrl]);

  const handleShare = async () => {
    const res = await shareOrCopy({
      title: 'Trấn Biên Kết Nối',
      text: `Link theo dõi phản ánh ${reportId}`,
      url: trackingUrl,
    });

    if (res === 'copied') {
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-center shadow-xs ${className}`}
    >
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-900">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>MÃ BÍ MẬT & LINK THEO DÕI</span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <div className="text-3xl font-bold font-mono tracking-widest text-primary select-all">
          {showSecret ? secretCode : '••••'}
        </div>
        <button
          type="button"
          onClick={() => setShowSecret(!showSecret)}
          aria-label={showSecret ? 'Ẩn mã' : 'Hiện'}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900"
        >
          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Mã QR theo dõi phản ánh"
            className="h-36 w-36 rounded-xl border border-blue-100 bg-white p-1 shadow-xs"
          />
        ) : (
          <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-white text-xs text-gray-400">
            Đang tải QR...
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-600 leading-relaxed">
        Máy này sẽ tự nhớ phản ánh của bạn. Đổi máy thì mở link đã lưu.
      </p>

      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-300" />
              <span>Đã sao chép link</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Lưu link theo dõi</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
