import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { formatDateTime } from '@/domain/format';
import { buildCitizenNotifications } from '@/domain/notifications';
import { maskPhone } from '@/domain/privacy';
import { Notification } from '@/domain/types';
import { SmsPreview } from '@/components/citizen/SmsPreview';
import { Button, Modal } from '@/components/ui';

export function C09Notifications() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const isLoggedIn = Boolean(state.settings.phone);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [smsPreviewItem, setSmsPreviewItem] = useState<Notification | null>(null);

  const myNotifications = useMemo(
    () => buildCitizenNotifications(state.reports, state.notifications, state.settings.phone),
    [state.reports, state.notifications, state.settings.phone]
  );

  const unreadCount = useMemo(
    () => myNotifications.filter((n) => !n.read).length,
    [myNotifications]
  );

  const filteredNotifs = useMemo(
    () => (filter === 'unread' ? myNotifications.filter((n) => !n.read) : myNotifications),
    [filter, myNotifications]
  );

  const handleOpenReport = (reportId: string) => {
    dispatch({
      type: 'MARK_NOTIFICATIONS_READ',
      payload: { phone: state.settings.phone },
    });
    navigate(`/phan-anh/${reportId}`);
  };

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3.5 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/ho-so')}
              aria-label="Quay lại hồ sơ"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-[var(--color-bg)] text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)] dark:border-slate-700"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  data-testid="screen-title"
                  className="truncate text-lg sm:text-xl font-extrabold tracking-tight text-[var(--color-text)]"
                >
                  Thông báo của tôi
                </h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#0084E8] px-2 py-0.5 text-[11px] font-extrabold text-white">
                    {unreadCount} mới
                  </span>
                )}
              </div>
            </div>
          </div>

          {isLoggedIn && unreadCount > 0 && (
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'MARK_NOTIFICATIONS_READ',
                  payload: { phone: state.settings.phone },
                })
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#E6F3FD] px-3 py-2 text-xs font-extrabold text-[#0084E8] transition hover:bg-[#BAE6FD]/60 dark:bg-sky-950/60 dark:text-[#38BDF8]"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Đánh dấu đã đọc</span>
              <span className="sm:hidden">Đã đọc</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 md:px-6 lg:px-8 py-5 space-y-4">
        {!isLoggedIn ? (
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-6 text-center shadow-2xs space-y-3 dark:border-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-base font-extrabold text-[var(--color-text)]">
              Đăng nhập để xem thông báo
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Thông báo tiến độ xử lý chỉ hiển thị sau khi bạn đăng nhập bằng số điện thoại.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/ho-so?login=1&redirect=%2Fthong-bao')}
            >
              Đăng nhập ngay
            </Button>
          </div>
        ) : (
          <>
            {/* Filter Pills */}
            {myNotifications.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-xs font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`rounded-lg px-3.5 py-1.5 transition ${
                      filter === 'all'
                        ? 'bg-[#0084E8] text-white shadow-2xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Tất cả ({myNotifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('unread')}
                    className={`rounded-lg px-3.5 py-1.5 transition ${
                      filter === 'unread'
                        ? 'bg-[#0084E8] text-white shadow-2xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>
              </div>
            )}

            {/* Direct SMS-Style Notification Cards (1 col Mobile -> 2 cols Tablet/PC) */}
            {filteredNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2.5 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <Bell className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  {filter === 'unread'
                    ? 'Bạn đã đọc hết thông báo'
                    : 'Chưa có thông báo tiến độ nào'}
                </p>
                <p className="max-w-xs text-xs text-[var(--color-text-muted)]">
                  {filter === 'unread'
                    ? 'Chuyển sang tab Tất cả để xem lại các thông báo trước đó.'
                    : 'Khi bạn bật nhận tin báo hoặc gửi phản ánh mới, cập nhật sẽ hiển thị tại đây.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredNotifs.map((n) => (
                  <article
                    key={n.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all ${
                      !n.read
                        ? 'border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] to-white dark:border-sky-800/80 dark:from-sky-950/45 dark:to-slate-900'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-2.5 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            <MessageSquare className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text)]">
                              <span>UBND P. Trấn Biên</span>
                              {!n.read && (
                                <span
                                  className="h-2 w-2 rounded-full bg-[#0084E8]"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                              Gửi tới {n.phone ? maskPhone(n.phone) : 'Thiết bị này'}
                            </div>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-lg bg-[#E6F3FD] px-2 py-0.5 text-[11px] font-extrabold text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                          #{n.reportId}
                        </span>
                      </div>

                      <div className="rounded-xl bg-[var(--color-surface-elevated)] p-3.5 text-xs text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                        {n.message}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 pt-1 text-[11px] text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        <span>{formatDateTime(n.createdAt)}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSmsPreviewItem(n)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text)] transition hover:border-[#0084E8]/40 hover:text-[#0084E8]"
                        >
                          <span>Xem tin nhắn mẫu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReport(n.reportId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0084E8]/10 px-2.5 py-1 text-xs font-bold text-[#0084E8] transition hover:bg-[#0084E8] hover:text-white dark:text-[#38BDF8]"
                        >
                          <span>Xem hồ sơ</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Modal
        isOpen={Boolean(smsPreviewItem)}
        onClose={() => setSmsPreviewItem(null)}
        title="Xem trước tin nhắn SMS"
      >
        {smsPreviewItem && (
          <SmsPreview
            phone={smsPreviewItem.phone ? maskPhone(smsPreviewItem.phone) : 'Thiết bị này'}
            message={smsPreviewItem.message}
            time={formatDateTime(smsPreviewItem.createdAt)}
          />
        )}
      </Modal>
    </div>
  );
}
