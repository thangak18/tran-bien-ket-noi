import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, MapPin, Type } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { FontScale } from '@/domain/types';
import { applyFontScale, FONT_SCALE_OPTIONS, resolveFontScale } from '@/lib/senior';

export const WELCOMED_STORAGE_KEY = 'tbkn:welcomed';

export interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { state, dispatch } = useAppStore();
  const [step, setStep] = useState<'intro' | 'font'>('intro');
  const [selectedScale, setSelectedScale] = useState<FontScale>(() =>
    resolveFontScale(state.settings)
  );

  const handleSelectFontScale = (scale: FontScale) => {
    setSelectedScale(scale);
    applyFontScale(scale);
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        fontScale: scale,
        seniorMode: scale === 'large' || scale === 'xlarge',
      },
    });
  };

  const handleFinish = () => {
    applyFontScale(selectedScale);
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        fontScale: selectedScale,
        seniorMode: selectedScale === 'large' || selectedScale === 'xlarge',
      },
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WELCOMED_STORAGE_KEY, '1');
    }
    onComplete();
  };

  const activeOption =
    FONT_SCALE_OPTIONS.find((o) => o.id === selectedScale) ?? FONT_SCALE_OPTIONS[1]!;

  return (
    <div
      data-testid="welcome-screen"
      className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col items-center justify-between overflow-y-auto bg-[var(--color-bg)] px-5 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 text-[var(--color-text)] select-none"
    >
      {/* Subtle Ambient Accent */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0084E8]/15 blur-[96px] dark:bg-[#38BDF8]/15 lg:h-[420px] lg:w-[420px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[96px]" />
      </div>

      {/* Top Minimal Brand Bar */}
      <div className="relative z-10 flex w-full max-w-[420px] md:max-w-[720px] lg:max-w-[960px] items-center justify-between">
        <div className="flex items-center gap-2.5">
          {step === 'font' && (
            <button
              type="button"
              onClick={() => setStep('intro')}
              aria-label="Quay lại"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-app.jpg"
              alt="Logo Trấn Biên Kết Nối"
              className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl object-cover shadow-sm"
            />
            <span className="text-sm md:text-base font-extrabold tracking-tight text-[var(--color-text)]">
              Trấn Biên Kết Nối
            </span>
          </div>
        </div>

        {/* Step Dots */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span
            className={`h-1.5 rounded-full transition-all duration-150 ${
              step === 'intro' ? 'w-5 bg-[#0084E8]' : 'w-1.5 bg-[var(--color-border)]'
            }`}
          />
          <span
            className={`h-1.5 rounded-full transition-all duration-150 ${
              step === 'font' ? 'w-5 bg-[#0084E8]' : 'w-1.5 bg-[var(--color-border)]'
            }`}
          />
        </div>
      </div>

      {/* Step 1: Responsive Hero (Mobile 1-col, Tablet/PC 2-col) */}
      {step === 'intro' && (
        <div className="relative z-10 my-auto w-full max-w-[420px] md:max-w-[720px] lg:max-w-[960px] animate-fade-up py-6">
          <div className="flex flex-col items-center text-center md:grid md:grid-cols-12 md:items-center md:gap-8 md:text-left lg:gap-14">
            {/* Showcase Card (Top on Mobile, Right on Tablet/PC) */}
            <div className="order-1 md:order-2 md:col-span-6 flex justify-center mb-8 md:mb-0 w-full">
              <div className="relative w-full max-w-[330px] md:max-w-[360px] lg:max-w-[400px]">
                <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-5 text-left shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-[#0084E8] dark:bg-sky-950/60 dark:text-[#38BDF8]">
                      <Camera className="h-3 w-3" />
                      30 giây gửi tin
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Đã xử lý
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="text-sm md:text-base font-extrabold text-[var(--color-text)]">
                      Đèn đường số 12 đã sáng trở lại
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <MapPin className="h-3.5 w-3.5 text-[#0084E8]" />
                      <span>Khu phố 3 · P. Trấn Biên</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-[11px] md:text-xs font-semibold text-[var(--color-text-muted)]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>Cập nhật tiến độ minh bạch theo thời gian thực</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Editorial Copy + Desktop/Tablet CTA (Bottom on Mobile, Left on Tablet/PC) */}
            <div className="order-2 md:order-1 md:col-span-6 flex flex-col items-center md:items-start">
              <span className="hidden md:inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-bold text-[var(--color-text-muted)] mb-4">
                Cổng phản ánh cộng đồng · Phường Trấn Biên
              </span>

              <h1 className="text-[28px] md:text-[34px] lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-[var(--color-text)]">
                Phản ánh nhanh.
                <br />
                <span className="text-[#0084E8] dark:text-[#38BDF8]">Phường sạch đẹp hơn.</span>
              </h1>

              <p className="mt-3 md:mt-4 max-w-[340px] md:max-w-[440px] text-sm md:text-base leading-relaxed text-[var(--color-text-muted)]">
                Chụp ảnh, định vị GPS và theo dõi UBND Phường Trấn Biên xử lý sự cố ngay trên điện
                thoại hoặc máy tính.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Font Scale Selection (Mobile 2x2, Tablet/PC 4-col) */}
      {step === 'font' && (
        <div className="relative z-10 my-auto flex w-full max-w-[420px] md:max-w-[680px] lg:max-w-[760px] flex-col animate-fade-up py-4 space-y-5 md:space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[#0084E8] dark:bg-sky-950/60 dark:text-[#38BDF8]">
              <Type className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[var(--color-text)]">
              Chọn kích cỡ chữ
            </h2>
          </div>

          {/* Live Preview */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Xem trước ({activeOption.label})
            </div>
            <p
              className="mt-1.5 font-semibold text-[var(--color-text)] transition-all duration-150"
              style={{ fontSize: `${activeOption.previewPx}px`, lineHeight: 1.4 }}
            >
              Hố ga trên đường Nguyễn Ái Quốc bị ngập nước sau mưa lớn.
            </p>
          </div>

          {/* 4 Font Scale Options: 2x2 on Mobile, 4x1 on Tablet/PC */}
          <div
            role="radiogroup"
            aria-label="Chọn kích cỡ chữ"
            className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3"
          >
            {FONT_SCALE_OPTIONS.map((opt) => {
              const isSelected = selectedScale === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectFontScale(opt.id)}
                  className={`relative flex flex-col items-start rounded-2xl border p-3.5 md:p-4 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border-[#0084E8] bg-sky-50/70 ring-2 ring-[#0084E8]/20 dark:border-[#38BDF8] dark:bg-sky-950/50'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className="font-extrabold leading-none text-[var(--color-text)]"
                      style={{ fontSize: `${opt.previewPx}px` }}
                    >
                      Aa
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0084E8] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 text-sm font-bold text-[var(--color-text)]">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{opt.hint}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Anchored CTA */}
      <div className="relative z-10 w-full max-w-[420px] md:max-w-[380px] space-y-2.5 pt-2">
        {step === 'intro' ? (
          <button
            type="button"
            onClick={() => setStep('font')}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-6 text-base font-extrabold text-white shadow-[0_10px_28px_rgba(0,132,232,0.28)] transition-all duration-150 hover:bg-[#0073CC] active:scale-[0.98]"
          >
            <span>Bắt đầu</span>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-6 text-base font-extrabold text-white shadow-[0_10px_28px_rgba(0,132,232,0.28)] transition-all duration-150 hover:bg-[#0073CC] active:scale-[0.98]"
          >
            <span>Hoàn tất &amp; Vào ứng dụng</span>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <p className="text-center text-[11px] font-medium text-[var(--color-text-muted)]">
          UBND Phường Trấn Biên · Kết nối phản ánh &amp; theo dõi xử lý
        </p>
      </div>
    </div>
  );
}
