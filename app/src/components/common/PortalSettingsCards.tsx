import { Bell, ChevronRight, MapPin, Moon, PhoneCall, Shield, Sun, Type } from 'lucide-react';
import { FontScale } from '@/domain/types';
import { FONT_SCALE_OPTIONS } from '@/lib/senior';
import { PortalAccent } from './PortalAuthFlow';

export interface PortalSettingsCardsProps {
  accent?: PortalAccent;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  fontScale: FontScale;
  onSelectFontScale: (scale: FontScale) => void;
  notificationsEnabled?: boolean;
  onToggleNotifications?: () => void;
  gpsEnabled?: boolean;
  onToggleGps?: () => void;
  onOpenHotline?: () => void;
  onOpenPrivacy?: () => void;
}

const ACTIVE_PILL: Record<PortalAccent, string> = {
  sky: 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-300',
  emerald:
    'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300',
  blue: 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-300',
};

const SWITCH_ON: Record<PortalAccent, string> = {
  sky: 'bg-sky-600 dark:bg-sky-500',
  emerald: 'bg-emerald-600 dark:bg-emerald-500',
  blue: 'bg-blue-600 dark:bg-blue-500',
};

export function PortalSettingsCards({
  accent = 'sky',
  theme,
  onToggleTheme,
  fontScale,
  onSelectFontScale,
  notificationsEnabled,
  onToggleNotifications,
  gpsEnabled,
  onToggleGps,
  onOpenHotline,
  onOpenPrivacy,
}: PortalSettingsCardsProps) {
  const activeClass = ACTIVE_PILL[accent];
  const switchOnClass = SWITCH_ON[accent];

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Theme card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-amber-300">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Giao diện hiển thị
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {theme === 'dark' ? 'Nền tối dịu mắt' : 'Nền sáng rõ nét'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors duration-150 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? 'Chuyển Sáng' : 'Chuyển Tối'}
          </button>
        </div>
      </div>

      {/* 4-level Font Scale card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Type className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Kích cỡ chữ</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Áp dụng đồng bộ toàn cổng
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FONT_SCALE_OPTIONS.map((opt) => {
            const active = fontScale === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectFontScale(opt.id)}
                className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 transition-all duration-150 ${
                  active
                    ? activeClass
                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-bold leading-none" style={{ fontSize: `${opt.previewPx}px` }}>
                  Aa
                </span>
                <span className="mt-1.5 text-[11px] font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Toggles */}
      {(onToggleNotifications || onToggleGps) && (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {onToggleNotifications && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Thông báo công việc
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(notificationsEnabled)}
                onClick={onToggleNotifications}
                className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${
                  notificationsEnabled ? switchOnClass : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}

          {onToggleGps && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Định vị GPS tự động
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(gpsEnabled)}
                onClick={onToggleGps}
                className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${
                  gpsEnabled ? switchOnClass : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${
                    gpsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Support & System Links */}
      {(onOpenHotline || onOpenPrivacy) && (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {onOpenHotline && (
            <button
              type="button"
              onClick={onOpenHotline}
              className="flex w-full items-center justify-between p-4 text-left transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <PhoneCall className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Tổng đài hỗ trợ nội bộ
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}
          {onOpenPrivacy && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="flex w-full items-center justify-between p-4 text-left transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Quy định bảo mật & dữ liệu
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
