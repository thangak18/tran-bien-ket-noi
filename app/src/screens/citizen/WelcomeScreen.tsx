import { useState } from 'react';
import { BarChart3, Camera, Check, Sparkles, Type, Users } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { FontScale } from '@/domain/types';
import { applyFontScale, FONT_SCALE_OPTIONS, resolveFontScale } from '@/lib/senior';

export const WELCOMED_STORAGE_KEY = 'tbkn:welcomed';

export interface WelcomeScreenProps {
  onComplete: () => void;
}

const APP_HIGHLIGHTS = [
  {
    icon: Camera,
    title: 'Chụp & Định vị GPS',
    desc: 'Gửi sự cố chỉ trong 30 giây',
    accent: 'from-sky-400/20 to-blue-500/20 text-sky-300 border-sky-400/25',
  },
  {
    icon: BarChart3,
    title: 'Theo dõi minh bạch',
    desc: 'Cập nhật tiến độ theo thời gian thực',
    accent: 'from-emerald-400/20 to-teal-500/20 text-emerald-300 border-emerald-400/25',
  },
  {
    icon: Users,
    title: 'Kết nối cộng đồng',
    desc: 'Đồng thuận & phản hồi trực tiếp với phường',
    accent: 'from-indigo-400/20 to-violet-500/20 text-indigo-300 border-indigo-400/25',
  },
] as const;

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { state, dispatch } = useAppStore();
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

  const handleGetStarted = () => {
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
      className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col items-center justify-between overflow-y-auto bg-gradient-to-b from-[#090E2A] via-[#0F1842] to-[#080D24] px-5 py-6 sm:py-8 text-white select-none"
    >
      {/* Ambient Background Glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0084E8]/25 blur-[96px]" />
        <div className="absolute bottom-10 right-1/4 h-64 w-64 rounded-full bg-indigo-500/20 blur-[96px]" />
      </div>

      {/* Main Centered Content */}
      <div className="relative z-10 my-auto flex w-full max-w-[460px] flex-col items-center text-center animate-fade-up space-y-6">
        {/* Emblem + Ward Pill */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4 flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#38BDF8] via-[#0084E8] to-[#4F46E5] shadow-[0_14px_40px_rgba(0,132,232,0.5)] ring-1 ring-white/25">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-white"
            >
              <path
                d="M9 4.5C9 3.67 9.67 3 10.5 3H19.5C20.33 3 21 3.67 21 4.5V11.5C21 12.33 20.33 13 19.5 13H17.5V15.5L14.5 13H10.5C9.67 13 9 12.33 9 11.5V4.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M3 9.5C3 8.67 3.67 8 4.5 8H14.5C15.33 8 16 8.67 16 9.5V16.5C16 17.33 15.33 18 14.5 18H9L5.5 21V18H4.5C3.67 18 3 17.33 3 16.5V9.5Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-bold tracking-wide text-sky-200">
            <Sparkles className="h-3 w-3 text-sky-300" aria-hidden="true" />
            <span>UBND Phường Trấn Biên · Đồng Nai</span>
          </span>

          <h1 className="mt-3 text-[26px] sm:text-[32px] font-extrabold tracking-tight text-white">
            Trấn Biên Kết Nối
          </h1>
          <p className="mt-1.5 max-w-sm text-sm sm:text-[15px] font-medium leading-relaxed text-slate-300">
            Phản ánh hiện trường nhanh chóng,{' '}
            <span className="font-bold text-[#7DD3FC]">chung tay xây dựng đô thị văn minh.</span>
          </p>
        </div>

        {/* 3 Promotional Feature Cards */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
          {APP_HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xs"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${item.accent}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-white">{item.title}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-300">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* First-time Font Size Selector (Default: Thường) */}
        <section
          aria-label="Chọn kích cỡ chữ"
          className="w-full rounded-3xl border border-white/15 bg-white/[0.07] p-4 text-left backdrop-blur-md space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0084E8]/30 text-sky-300">
                <Type className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                Chọn kích cỡ chữ
              </span>
            </div>
            <span className="text-[11px] font-semibold text-sky-300">{activeOption.hint}</span>
          </div>

          <div
            role="radiogroup"
            aria-label="Kích cỡ chữ hiển thị"
            className="grid grid-cols-4 gap-2"
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
                  className={`relative flex flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition-all ${
                    isSelected
                      ? 'border-[#38BDF8] bg-[#0084E8]/35 text-white shadow-[0_6px_16px_rgba(0,132,232,0.3)] ring-2 ring-[#38BDF8]/30'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/[0.08]'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#38BDF8] text-slate-950 shadow-xs">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className="font-extrabold leading-none"
                    style={{ fontSize: `${opt.previewPx}px` }}
                  >
                    Aa
                  </span>
                  <span className="mt-1.5 text-[11px] font-bold leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Live Text Preview */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-slate-200">
            <p className="leading-snug" style={{ fontSize: `${activeOption.previewPx}px` }}>
              Xem trước: Đèn đường hẻm 214 bị tắt, cần kiểm tra sớm.
            </p>
          </div>
        </section>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 mt-6 w-full max-w-[460px] space-y-3 text-center">
        <button
          type="button"
          onClick={handleGetStarted}
          className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F6BFF] via-[#0084E8] to-[#0EA5E9] px-6 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(0,132,232,0.45)] transition hover:brightness-110 active:scale-[0.99]"
        >
          Bắt đầu
        </button>

        <p className="text-[11px] leading-relaxed text-slate-400">
          Bạn có thể thay đổi lại kích cỡ chữ bất kỳ lúc nào trong mục Hồ sơ → Cài đặt.
        </p>
      </div>
    </div>
  );
}
