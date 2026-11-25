import { useEffect, useState } from 'react';
import { Check, Copy, Phone, PhoneCall, PhoneOff, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';

export interface HotlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLineId?: 'main' | 'office' | 'emergency';
}

interface HotlineLine {
  id: 'main' | 'office' | 'emergency';
  title: string;
  subtitle: string;
  numberDisplay: string;
  telHref: string;
  badge: string;
  badgeColor: string;
}

const HOTLINE_LINES: HotlineLine[] = [
  {
    id: 'main',
    title: 'Tổng đài tiếp nhận hiện trường',
    subtitle: 'Đèn đường, ngập nước, rác thải, hư hỏng mặt đường',
    numberDisplay: '0251 382 0000',
    telHref: '02513820000',
    badge: 'Trực 24/7',
    badgeColor:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    id: 'office',
    title: 'Bàn tiếp dân UBND P. Trấn Biên',
    subtitle: 'Tra cứu tiến độ hồ sơ, hướng dẫn thủ tục & phản hồi',
    numberDisplay: '0251 3822 111',
    telHref: '02513822111',
    badge: '07:00 – 17:30',
    badgeColor:
      'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
  },
  {
    id: 'emergency',
    title: 'Đội xung kích & Sự cố khẩn cấp',
    subtitle: 'Sụt lún nguy hiểm, rò điện, ngập sâu, cản trở giao thông',
    numberDisplay: '0251 382 0000 (Nhánh 2)',
    telHref: '02513820000,2',
    badge: 'Khẩn cấp 24/7',
    badgeColor:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
  },
];

function formatSeconds(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function HotlineModal({ isOpen, onClose, defaultLineId = 'main' }: HotlineModalProps) {
  const [selectedId, setSelectedId] = useState<'main' | 'office' | 'emergency'>(defaultLineId);
  const [calling, setCalling] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCalling(false);
      setCallSeconds(0);
      setCopiedId(null);
      setSelectedId(defaultLineId);
    }
  }, [isOpen, defaultLineId]);

  useEffect(() => {
    if (!calling) {
      setCallSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [calling]);

  const activeLine = HOTLINE_LINES.find((l) => l.id === selectedId) ?? HOTLINE_LINES[0]!;

  const handleCopyNumber = (line: HotlineLine, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const raw = line.numberDisplay.replace(/\s*\(.*\)/, '');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(raw).catch(() => {});
    }
    setCopiedId(line.id);
    window.setTimeout(() => {
      setCopiedId((cur) => (cur === line.id ? null : cur));
    }, 2000);
  };

  const handleStartCall = (lineId?: 'main' | 'office' | 'emergency') => {
    if (lineId) setSelectedId(lineId);
    setCalling(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-[94vw] sm:!max-w-lg !rounded-3xl !bg-[var(--color-surface)] !p-4 sm:!p-6 max-h-[90dvh] overflow-y-auto"
      title={
        <span className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--color-text)]">
          Đường dây nóng phường Trấn Biên
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] rounded-2xl border border-slate-200/90 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Đóng
          </button>

          {calling ? (
            <button
              type="button"
              onClick={() => setCalling(false)}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(225,29,72,0.32)] transition hover:bg-rose-700 active:scale-[0.99]"
            >
              <PhoneOff className="h-4 w-4" aria-hidden="true" />
              <span>Kết thúc cuộc gọi ({formatSeconds(callSeconds)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStartCall()}
              className="btn-primary-action inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#0D9488] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(15,118,110,0.34)] transition hover:from-[#0D655E] hover:to-[#0F766E] active:scale-[0.99]"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>Gọi {activeLine.numberDisplay.replace(/\s*\(.*\)/, '')}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3 text-sm text-[var(--color-text)]">
        {calling && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span>
                {callSeconds < 2
                  ? `Đang kết nối ${activeLine.title}...`
                  : `Đang đàm thoại · ${activeLine.numberDisplay}`}
              </span>
            </div>
            <span className="rounded-lg bg-emerald-200/70 px-2 py-0.5 font-mono text-[11px] text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100">
              {formatSeconds(callSeconds)}
            </span>
          </div>
        )}

        <div className="space-y-2.5">
          {HOTLINE_LINES.map((line) => {
            const isSelected = line.id === selectedId;
            return (
              <div
                key={line.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(line.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(line.id);
                  }
                }}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#0F766E] bg-teal-50/65 ring-2 ring-[#0F766E]/15 dark:border-teal-500 dark:bg-teal-950/30'
                    : 'border-slate-200/85 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-[#0F766E] text-white shadow-2xs'
                        : 'bg-white text-slate-600 shadow-2xs dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {line.id === 'emergency' ? (
                      <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs sm:text-[13px] font-extrabold text-[var(--color-text)]">
                        {line.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${line.badgeColor}`}
                      >
                        {line.badge}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-sm sm:text-[15px] font-extrabold text-[#0F766E] dark:text-teal-300">
                      {line.numberDisplay}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {line.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleCopyNumber(line, e)}
                    aria-label={`Sao chép số ${line.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {copiedId === line.id ? (
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartCall(line.id);
                    }}
                    aria-label={`Gọi ${line.title}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-[#0F766E] text-white shadow-xs hover:bg-[#0D655E]'
                        : 'border border-slate-200 bg-white text-[#0F766E] hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:text-teal-300'
                    }`}
                  >
                    <PhoneCall className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
