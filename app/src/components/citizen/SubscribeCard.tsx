import React, { useState } from 'react';
import { BellRing, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { maskPhone } from '@/domain/privacy';

export interface SubscribeCardProps {
  reportId: string;
  currentPhone?: string;
  onSubscribe: (phone: string) => Promise<void> | void;
  onUnsubscribe?: () => Promise<void> | void;
  className?: string;
}

export const SubscribeCard: React.FC<SubscribeCardProps> = ({
  reportId,
  currentPhone,
  onSubscribe,
  onUnsubscribe,
  className = '',
}) => {
  const [isOtpOpen, setIsOtpOpen] = useState(false);

  const handleVerified = async (phone: string) => {
    await onSubscribe(phone);
    setIsOtpOpen(false);
  };

  if (currentPhone) {
    return (
      <div
        data-report-id={reportId}
        className={`flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="text-xs text-gray-800">
            Đang nhận tin qua{' '}
            <strong className="font-semibold text-gray-900">{maskPhone(currentPhone)}</strong>
          </div>
        </div>
        {onUnsubscribe && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onUnsubscribe}
            className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[36px]"
          >
            Huỷ
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        data-report-id={reportId}
        className={`rounded-2xl border border-blue-200 bg-white p-4 shadow-xs ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 flex-shrink-0">
            <BellRing className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900">Nhận tin báo cho phản ánh này</h4>
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              Số điện thoại chỉ dùng cho phản ánh này, không hiển thị công khai.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOtpOpen(true)}
                className="w-full sm:w-auto"
              >
                Nhận tin báo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PhoneOtpSheet
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        onVerified={handleVerified}
      />
    </>
  );
};
