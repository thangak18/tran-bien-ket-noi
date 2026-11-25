import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  GitMerge,
  Share2,
  Star,
  ZoomIn,
} from 'lucide-react';
import { CitizenLayout } from '@/layouts/CitizenLayout';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { QrShareCard } from '@/components/citizen/QrShareCard';
import { RatingSheet } from '@/components/citizen/RatingSheet';
import { SubscribeCard } from '@/components/citizen/SubscribeCard';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { DelayChip } from '@/components/common/DelayChip';
import { MediaCaptureField, MediaItemPreview } from '@/components/common/MediaCapture';
import { StatusChip } from '@/components/common/StatusChip';
import { BottomSheet, Button, EmptyState, Modal, Toast } from '@/components/ui';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { followerCount, hasOwnerAccess } from '@/domain/access';
import { formatDate, formatDateTime } from '@/domain/format';
import { formatLatestUpdate } from '@/domain/latestUpdate';
import { toPublicReport } from '@/domain/privacy';
import { publicTimeline } from '@/domain/status';
import { Report, Status, TimelineEntry } from '@/domain/types';
import { isVideoSource } from '@/lib/media';
import { buildTrackingUrl } from '@/lib/share';
import { useAppStore } from '@/store/AppStore';
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { isApiMode } from '@/lib/api';

const FOLLOWED_STORAGE_KEY = 'tbkn:followed-reports';

function getFollowedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FOLLOWED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFollowedId(reportId: string): void {
  if (typeof window === 'undefined') return;
  const list = getFollowedIds();
  if (!list.includes(reportId)) {
    window.localStorage.setItem(FOLLOWED_STORAGE_KEY, JSON.stringify([...list, reportId]));
  }
}

// AC-C06-13: "Tôi cũng gặp" ẩn khi hồ sơ đã xử lý xong hoặc kết thúc.
const CLOSED_OR_TERMINAL_STATUSES: ReadonlyArray<Status> = [
  'hoan_thanh',
  'dong',
  'da_gop',
  'chuyen_co_quan',
  'khong_xac_nhan',
];

const PROGRESS_STEP_LABELS = ['Đã gửi', 'Tiếp nhận', 'Đang xử lý', 'Đã xử lý'] as const;

const INLINE_RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
};

function formatShortTime(isoString?: string | null): string {
  if (!isoString) return '';
  return formatDateTime(isoString); // "24/11/2026 08:37"
}

function formatTimelineEntryText(entry: TimelineEntry, report: Report): string {
  if (entry.note && entry.note.trim().length > 0) {
    if (entry.actor === 'Người dân') {
      return `Người dân: ${entry.note.trim()}`;
    }
    return entry.note.trim();
  }
  switch (entry.status) {
    case 'moi':
      return 'Người dân đã gửi phản ánh';
    case 'da_tiep_nhan':
      return 'Phường Trấn Biên đã tiếp nhận phản ánh';
    case 'cho_xac_minh':
      return 'Phường Trấn Biên đã chuyển tình nguyện viên xác minh tại chỗ';
    case 'da_giao':
      return `Phường Trấn Biên đã giao ${report.department || 'đơn vị chuyên trách'}`;
    case 'hoan_thanh':
      return report.resultNote || 'Đơn vị chuyên trách đã xử lý hoàn tất';
    case 'dong':
      return 'Hồ sơ phản ánh đã đóng';
    case 'mo_lai':
      return 'Người dân phản hồi cần kiểm tra lại hiện trường';
    default:
      return 'Cập nhật trạng thái xử lý';
  }
}

function getShortIssueHeading(report: Report, catLabel: string): string {
  if (report.title && report.title.trim().length > 0) {
    return `${catLabel} · ${report.title.trim()}`;
  }
  if (report.status === 'hoan_thanh' || report.status === 'dong') {
    const shortStreet = report.address.split(',')[0]?.trim() || report.address;
    return `${catLabel} · ${shortStreet}`;
  }
  if (report.description && report.description.trim().length > 0) {
    const clean = report.description
      .trim()
      .replace(/[.!?]+$/, '')
      .slice(0, 36);
    return `${catLabel} · ${clean}`;
  }
  const shortStreet = report.address.split(',')[0]?.trim() || report.address;
  return `${catLabel} · ${shortStreet}`;
}

function getProgressSubtitle(report: Report, now: string): string {
  if (report.status === 'hoan_thanh' || report.status === 'dong') {
    if (report.resultNote && report.resultNote.trim().length > 0) {
      return report.resultNote.trim();
    }
    return `${report.department || 'Đơn vị chuyên trách'} đã xử lý và nghiệm thu hoàn tất.`;
  }

  const dueStr = report.dueAt ? formatDate(report.dueAt) : '';
  const dept = report.department || 'Đội chuyên trách';

  if (report.status === 'da_giao' || report.status === 'mo_lai') {
    return dueStr ? `Đã giao ${dept} · Dự kiến xong trước ${dueStr}` : `Đã giao ${dept}`;
  }
  if (report.status === 'da_tiep_nhan') {
    return dueStr
      ? `Phường đã tiếp nhận · Dự kiến xong trước ${dueStr}`
      : 'Phường Trấn Biên đã tiếp nhận phản ánh';
  }
  if (report.status === 'cho_xac_minh') {
    return 'Tình nguyện viên đang xác minh hiện trường';
  }
  return formatLatestUpdate(report, now);
}

export function C06Detail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const ds = useDataSource();
  const action = useAction();

  const urlKey = searchParams.get('k');
  const now = state.settings.demoNow;

  const rawReport = useMemo(() => state.reports.find((r) => r.id === id), [state.reports, id]);

  const [activeHeroIdx, setActiveHeroIdx] = useState<number>(0);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ src: string; alt: string } | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [inlineRating, setInlineRating] = useState<number>(4);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenNote, setReopenNote] = useState('');
  const [reopenMedia, setReopenMedia] = useState<string[]>([]);
  const [isRatingAuthOpen, setIsRatingAuthOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFollowed, setHasFollowed] = useState<boolean>(() => {
    if (!id) return false;
    const inLocal = getFollowedIds().includes(id);
    const inFollowers = Boolean(
      state.settings.phone && rawReport?.followers.includes(state.settings.phone)
    );
    return inLocal || inFollowers;
  });
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    setActiveHeroIdx(0);
  }, [id]);

  // Hồ sơ chưa có trong store (mở thẳng link, hoặc chế độ API): tải chi tiết công khai.
  useEffect(() => {
    if (rawReport || !id) return;
    let cancelled = false;
    void ds
      .getReportById(id)
      .then((rep) => {
        if (rep && !cancelled) dispatch({ type: 'ADD_REPORT', payload: { report: rep } });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, rawReport, ds, dispatch]);

  // Lỗi của thao tác ghi hiển thị bằng toast (có chữ "Lỗi" trong nội dung thông báo từ useAction).
  useEffect(() => {
    if (action.error) setToast({ message: action.error, type: 'error' });
  }, [action.error]);

  // Kiểm tra ?k= và tự động ghi nhận quyền chủ hồ sơ trên thiết bị (AC-C06-10)
  const [apiKeyInvalid, setApiKeyInvalid] = useState(false);
  const claimTried = useRef<string | null>(null);
  const hasInvalidKey = useMemo(() => {
    if (!urlKey) return false;
    if (isApiMode()) return apiKeyInvalid;
    if (!rawReport) return false;
    return rawReport.secretCode !== urlKey;
  }, [rawReport, urlKey, apiKeyInvalid]);
  useEffect(() => {
    if (!rawReport || !urlKey) return;
    const claimKey = `${rawReport.id}:${urlKey}`;
    if (claimTried.current === claimKey) return;
    if (isApiMode()) {
      claimTried.current = claimKey;
      ds.claimReportByKey(rawReport.id, urlKey).catch(() => setApiKeyInvalid(true));
      return;
    }
    if (rawReport.secretCode === urlKey) {
      const alreadyClaimed = state.settings.deviceReports.some(
        (d) => d.id === rawReport.id && d.secretCode === urlKey
      );
      claimTried.current = claimKey;
      if (!alreadyClaimed) void ds.claimReportByKey(rawReport.id, urlKey);
    }
  }, [rawReport, urlKey, state.settings.deviceReports, ds]);
  const localOwner = useMemo(() => {
    if (!rawReport) return false;
    return hasOwnerAccess(rawReport, {
      phone: state.settings.phone,
      deviceReports: state.settings.deviceReports,
      urlKey,
    });
  }, [rawReport, state.settings.phone, state.settings.deviceReports, urlKey]);

  // Chế độ API: danh sách công khai không có SĐT người theo dõi; hỏi máy chủ (SĐT đã OTP hoặc khoá chủ hồ sơ).
  const [apiOwner, setApiOwner] = useState(false);
  const rawReportId = rawReport?.id;
  const rawReportStatus = rawReport?.status;
  useEffect(() => {
    if (!isApiMode() || !rawReportId) return;
    let cancelled = false;
    ds.isReportOwner(rawReportId)
      .then((owner) => {
        if (!cancelled) setApiOwner(owner);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ds, rawReportId, rawReportStatus, state.settings.phone]);
  const isOwner = isApiMode() ? apiOwner : localOwner;
  // Nếu không phải chủ hồ sơ thì ẩn trường nhạy cảm qua toPublicReport
  const displayReport: Report | null = useMemo(() => {
    if (!rawReport) return null;
    if (isOwner) return rawReport;
    const pub = toPublicReport(rawReport);
    return {
      ...rawReport,
      photos: pub.photos,
      reporterPhone: undefined,
      secretCode: '',
      followers: [],
      anonymousFollows: pub.followerCount,
      timeline: pub.timeline,
    };
  }, [rawReport, isOwner]);

  const reverseTimeline = useMemo(() => {
    if (!displayReport) return [];
    return [...displayReport.timeline].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [displayReport]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (!rawReport || !displayReport) {
    return (
      <CitizenLayout>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Quay lại"
            className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            data-testid="screen-title"
            className="text-[var(--fs-title)] font-bold text-[var(--color-text)]"
          >
            Chi tiết phản ánh
          </h1>
        </header>
        <div className="flex-1 p-6 flex items-center justify-center">
          <EmptyState
            icon={<AlertTriangle />}
            title="Không tìm thấy phản ánh"
            description={`Mã phản ánh ${id || ''} không tồn tại hoặc đã bị gỡ.`}
            actionText="Về trang chủ"
            onAction={() => navigate('/')}
          />
        </div>
      </CitizenLayout>
    );
  }

  const catConfig =
    CATEGORY_CONFIGS.find((c) => c.key === displayReport.category) || CATEGORY_CONFIGS[0]!;
  const isCompletedOrClosed =
    displayReport.status === 'hoan_thanh' || displayReport.status === 'dong';
  // Người gửi không tự "Tôi cũng gặp" cho hồ sơ của mình (AC-C06-13). Chế độ API: chủ hồ sơ = người gửi.
  const isReporter = isApiMode()
    ? isOwner
    : Boolean(state.settings.phone && rawReport.reporterPhone === state.settings.phone);
  const isOpenForFollow =
    !CLOSED_OR_TERMINAL_STATUSES.includes(displayReport.status) && !isReporter;
  const totalFollowers = Math.max(1, followerCount(displayReport));

  const subscribedPhone =
    isOwner && rawReport.anonymous && rawReport.subscribedLater
      ? rawReport.followers[0]
      : undefined;

  const shareTrackingUrl = isOwner
    ? buildTrackingUrl(rawReport.id, rawReport.secretCode)
    : `${typeof window !== 'undefined' ? window.location.origin : 'https://tranbien.vn'}/phan-anh/${displayReport.id}`;

  const handleShareLink = () => {
    setIsShareOpen(true);
  };

  const handleRatingSubmit = async (data: { rating: number; tags: string[]; comment?: string }) => {
    setIsSubmitting(true);
    const updated = await action.run(
      () =>
        ds.submitFeedback(rawReport.id, {
          resolved: true,
          rating: data.rating,
          tags: data.tags,
          comment: data.comment,
        }),
      { onConflict: reloadReport }
    );
    setIsSubmitting(false);
    if (!updated) return;
    if (isApiMode()) dispatch({ type: 'ADD_REPORT', payload: { report: updated } });
    setIsRatingOpen(false);
    setToast({ message: 'Cảm ơn bạn đã đánh giá! Phản ánh đã được đóng.', type: 'success' });
  };
  const reloadReport = async () => {
    const fresh = await ds.getReportById(rawReport.id);
    if (fresh) dispatch({ type: 'ADD_REPORT', payload: { report: fresh } });
  };
  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const updated = await action.run(
      () =>
        ds.submitFeedback(rawReport.id, {
          resolved: false,
          comment: reopenNote.trim() || undefined,
        }),
      { onConflict: reloadReport }
    );
    setIsSubmitting(false);
    if (!updated) return;
    if (isApiMode()) dispatch({ type: 'ADD_REPORT', payload: { report: updated } });
    setIsReopenOpen(false);
    setReopenNote('');
    setReopenMedia([]);
    setToast({ message: 'Phường đã nhận ý kiến và sẽ kiểm tra lại.', type: 'info' });
  };
  const handleSupplement = () => {
    // Bỏ bản nháp đang dở (nếu có) để không trộn với dữ liệu của hồ sơ cần bổ sung.
    dispatch({ type: 'CLEAR_DRAFT' });
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        photos: [...rawReport.photos],
        lat: rawReport.lat,
        lng: rawReport.lng,
        address: rawReport.address,
        locationNote: rawReport.locationNote,
        category: rawReport.category,
        title: rawReport.title,
        description: rawReport.description,
        // Bản nháp nhớ hồ sơ đang bổ sung, kể cả khi đi qua bước đăng nhập (AC-C06-7).
        supplementFor: rawReport.id,
        aiSuggestion: undefined,
        aiPhotoKey: undefined,
      },
    });
    navigate('/bao-su-co/anh');
  };

  const handleSubscribe = async (phone: string) => {
    const updated = await action.run(() => ds.claimReport(rawReport.id, phone), {
      onConflict: reloadReport,
    });
    if (!updated) return;
    if (isApiMode()) dispatch({ type: 'ADD_REPORT', payload: { report: updated } });
    setToast({ message: `Đã đăng ký nhận tin báo cho #${rawReport.id}.`, type: 'success' });
  };
  const handleUnsubscribe = async () => {
    if (!subscribedPhone) return;
    const updated = await action.run(() => ds.unsubscribeReport(rawReport.id, subscribedPhone), {
      onConflict: reloadReport,
    });
    if (!updated) return;
    if (isApiMode()) dispatch({ type: 'ADD_REPORT', payload: { report: updated } });
    setToast({ message: 'Đã huỷ nhận tin báo cho phản ánh này.', type: 'info' });
  };
  const handleFollowIssue = async () => {
    if (hasFollowed) return;
    // AC-C06-13: chưa đăng nhập thì đăng nhập trước, xong quay lại đúng hồ sơ này.
    if (!state.settings.phone) {
      navigate(`/ho-so?login=1&redirect=${encodeURIComponent(`/phan-anh/${rawReport.id}`)}`);
      return;
    }
    const res = await action.run(() => ds.followReport(rawReport.id, state.settings.phone), {
      onConflict: reloadReport,
    });
    if (!res) return;
    saveFollowedId(rawReport.id);
    setHasFollowed(true);
    if (res.alreadyFollowed) {
      setToast({ message: 'Bạn đã báo vấn đề này', type: 'info' });
      return;
    }
    if (isApiMode()) void reloadReport();
    setToast({ message: 'Đã ghi nhận! Bạn cũng đang theo dõi vấn đề này.', type: 'success' });
  };
  const handleBeforeAfterClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLImageElement && e.target.src) {
      setZoomedPhoto({ src: e.target.src, alt: e.target.alt || 'Ảnh phản ánh' });
    }
  };

  const steps = publicTimeline(displayReport);
  const currentStepIdx = steps.findIndex((s) => s.status === 'current');
  const activeStepCount = isCompletedOrClosed
    ? 3
    : currentStepIdx >= 0
      ? currentStepIdx
      : steps.filter((s) => s.status === 'done').length;

  const activePhotoSrc =
    displayReport.photos[Math.min(activeHeroIdx, Math.max(0, displayReport.photos.length - 1))] ??
    displayReport.photos[0];

  return (
    <CitizenLayout>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Quay lại"
              className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 data-testid="screen-title" className="sr-only">
                Chi tiết phản ánh
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid="report-id"
                  className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--color-text)]"
                >
                  Chi tiết #{displayReport.id}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-[#E6F3FD] px-2.5 py-0.5 text-xs font-extrabold text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                  <CategoryIcon category={displayReport.category} className="h-3.5 w-3.5" />
                  {catConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions: Status Pill + Share Button */}
          <div className="flex items-center gap-2">
            {isCompletedOrClosed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold text-[#15803D] dark:bg-emerald-950/70 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã xử lý
              </span>
            )}
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F3FD] px-3.5 py-1.5 text-xs font-extrabold text-[#0084E8] transition hover:bg-[#D0E8FC] dark:bg-sky-950/70 dark:text-[#38BDF8]"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="sticky top-14 z-30 mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8 pt-2">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Main Content Container: Responsive 12-Col Layout on PC/Tablet */}
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:px-6 lg:px-8 pb-20">
        {/* Top Alerts (Invalid secret key, Merged report, Transferred report) */}
        {hasInvalidKey && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>Link theo dõi không đúng – hãy kiểm tra lại mã bí mật.</span>
          </div>
        )}

        {displayReport.status === 'da_gop' && displayReport.mergedInto && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-3.5 text-sm text-purple-950 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200">
            <div className="flex items-center gap-2.5">
              <GitMerge className="h-5 w-5 shrink-0 text-purple-600" />
              <span className="font-semibold">Đã gộp vào #{displayReport.mergedInto}</span>
            </div>
            <Link
              to={`/phan-anh/${displayReport.mergedInto}`}
              className="shrink-0 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              Xem hồ sơ chính
            </Link>
          </div>
        )}

        {displayReport.status === 'chuyen_co_quan' && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <div className="font-semibold">Đã chuyển cơ quan khác</div>
              <div className="mt-0.5 text-xs text-blue-800 dark:text-blue-300">
                {displayReport.timeline.find((t) => t.status === 'chuyen_co_quan')?.note ||
                  'Phản ánh đã được chuyển đến đơn vị có thẩm quyền giải quyết.'}
              </div>
            </div>
          </div>
        )}

        {/* Responsive 12-Col Split: Left (Photo + Compact Address/Upvote) | Right (Progress + Compact Timeline + Owner Tools) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
          {/* =================================================================
              LEFT COLUMN (lg:col-span-6): PHOTO / BEFORE-AFTER + COMPACT ADDRESS & UPVOTE
             ================================================================= */}
          <div className="lg:col-span-6 space-y-3.5">
            {/* 1A. When In-Progress: Clean Hero Photo */}
            {!isCompletedOrClosed && displayReport.photos.length > 0 && (
              <section aria-label="Ảnh hiện trường" className="space-y-2">
                {activePhotoSrc && isVideoSource(activePhotoSrc) ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-2xs dark:border-slate-700">
                    <MediaItemPreview
                      src={activePhotoSrc}
                      alt={`Video phản ánh ${displayReport.id}`}
                      className="h-[200px] sm:h-[260px] lg:h-[300px] w-full object-contain"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setZoomedPhoto({
                        src: activePhotoSrc!,
                        alt: `Ảnh phản ánh ${displayReport.id}`,
                      })
                    }
                    className="group block w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] dark:border-slate-700"
                  >
                    <img
                      src={activePhotoSrc}
                      alt={`Ảnh phản ánh ${displayReport.id}`}
                      className="h-[200px] sm:h-[260px] lg:h-[300px] w-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.015]"
                    />
                  </button>
                )}

                {displayReport.photos.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    {displayReport.photos.map((photo, idx) => {
                      const isSelected = idx === activeHeroIdx;
                      return (
                        <button
                          key={`${photo}-${idx}`}
                          type="button"
                          onClick={() => setActiveHeroIdx(idx)}
                          className={`relative h-14 w-18 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-[#0084E8] ring-2 ring-[#0084E8]/25'
                              : 'border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-700'
                          }`}
                        >
                          {isVideoSource(photo) ? (
                            <video
                              src={photo}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={photo}
                              alt={`Ảnh hiện trường ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* 1B. When Completed: Before / After Comparison Card */}
            {isCompletedOrClosed && (
              <section
                aria-label="Ảnh trước và sau xử lý"
                className="rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs space-y-3 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-[var(--color-text)]">
                    Ảnh Trước / Sau xử lý
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <ZoomIn className="h-3 w-3" />
                    Chạm ảnh để phóng to
                  </span>
                </div>

                <div onClick={handleBeforeAfterClick} className="[&_img]:cursor-zoom-in">
                  <BeforeAfter
                    beforePhotos={displayReport.photos}
                    afterPhotos={displayReport.resultPhotos}
                    beforeTime={displayReport.createdAt}
                    afterTime={displayReport.completedAt}
                    category={displayReport.category}
                  />
                </div>

                {displayReport.resultNote && (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <span className="font-extrabold text-[#15803D] dark:text-emerald-300">
                      Kết quả xử lý:{' '}
                    </span>
                    <span>{displayReport.resultNote}</span>
                  </div>
                )}
              </section>
            )}

            {/* 2. Compact Address & Community Upvote Card (Shown on Desktop/Tablet left col, or below Progress on Mobile via order) */}
            <section
              aria-label="Vị trí và đồng thuận cộng đồng"
              className="hidden lg:block rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs space-y-3 dark:border-slate-800"
            >
              <div>
                <div className="text-[15px] font-extrabold text-[var(--color-text)]">
                  {displayReport.address}
                </div>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {totalFollowers} người cùng báo vấn đề này
                </p>
              </div>

              {isOpenForFollow && (
                <button
                  type="button"
                  disabled={hasFollowed}
                  onClick={handleFollowIssue}
                  className={`flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-extrabold transition-all ${
                    hasFollowed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0084E8] hover:border-[#0084E8] hover:bg-[#E0F2FE] active:scale-[0.99] dark:border-sky-800 dark:bg-sky-950/50 dark:text-[#38BDF8]'
                  }`}
                >
                  {hasFollowed ? 'Bạn đã báo vấn đề này' : 'Tôi cũng gặp vấn đề này'}
                </button>
              )}
            </section>
          </div>

          {/* =================================================================
              RIGHT COLUMN (lg:col-span-6): PROGRESS STEPPER + ADDRESS CARD (MOBILE) + COMPACT TIMELINE + OWNER TOOLS
             ================================================================= */}
          <div className="lg:col-span-6 space-y-3.5">
            {/* 1. 4-Step Progress Tracker Card */}
            <section
              aria-label="Hành trình phản ánh"
              className={`rounded-2xl border p-4 shadow-2xs ${
                isCompletedOrClosed
                  ? 'border-[#BBF7D0] bg-[#ECFDF5] dark:border-emerald-800 dark:bg-emerald-950/35'
                  : 'border-slate-200/90 bg-[var(--color-surface)] dark:border-slate-800'
              }`}
            >
              {/* Card Header: Title + StatusChip */}
              <div className="flex items-start justify-between gap-2 mb-3.5">
                <h2 className="text-[15px] font-extrabold text-[var(--color-text)] leading-snug">
                  {getShortIssueHeading(displayReport, catConfig.label)}
                </h2>
                {!isCompletedOrClosed && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusChip status={displayReport.status} />
                    <DelayChip report={displayReport} now={now} />
                  </div>
                )}
              </div>

              {/* 4-Step Stepper */}
              <ol role="list" className="relative flex w-full items-start justify-between my-1.5">
                <div
                  className={`absolute top-3.5 left-[12.5%] right-[12.5%] h-[2.5px] ${
                    isCompletedOrClosed ? 'bg-[#15803D]' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  aria-hidden="true"
                />
                {!isCompletedOrClosed && activeStepCount > 0 && (
                  <div
                    className="absolute top-3.5 left-[12.5%] h-[2.5px] bg-[#0084E8] transition-all"
                    style={{ width: `${Math.min(100, (activeStepCount / 3) * 75)}%` }}
                    aria-hidden="true"
                  />
                )}

                {steps.map((step, idx) => {
                  const isDone = isCompletedOrClosed || step.status === 'done';
                  const isCurrent = !isCompletedOrClosed && step.status === 'current';
                  const label = PROGRESS_STEP_LABELS[idx] ?? step.label;

                  return (
                    <li
                      key={step.step}
                      role="listitem"
                      aria-current={isCurrent ? 'step' : undefined}
                      className="relative z-10 flex flex-1 flex-col items-center text-center px-1"
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold transition-all select-none ${
                          isCompletedOrClosed
                            ? 'bg-[#15803D] text-white'
                            : isDone
                              ? 'bg-[#0084E8] text-white'
                              : isCurrent
                                ? 'border-2 border-[#0084E8] bg-white text-[#0084E8] ring-4 ring-[#0084E8]/15 dark:bg-slate-900 dark:text-[#38BDF8]'
                                : 'border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.step}
                      </div>
                      <span
                        className={`mt-1.5 text-[11px] leading-tight text-center ${
                          isCompletedOrClosed || isDone || isCurrent
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'font-medium text-slate-400'
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {/* Summary Subtitle inside Progress Card */}
              <p
                className={`mt-3 text-xs leading-relaxed ${
                  isCompletedOrClosed
                    ? 'font-semibold text-[#15803D] dark:text-emerald-200'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {getProgressSubtitle(displayReport, now)}
              </p>
            </section>

            {/* Mô tả chi tiết sự cố */}
            {displayReport.description?.trim() && (
              <section
                aria-label="Mô tả sự cố"
                className="rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs dark:border-slate-800"
              >
                <div className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Mô tả
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">
                  {displayReport.description}
                </p>
              </section>
            )}

            {/* Mobile/Tablet Compact Address & Community Upvote Card */}
            <section
              aria-label="Địa chỉ và xác nhận cùng gặp"
              className="lg:hidden rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs space-y-3 dark:border-slate-800"
            >
              <div>
                <div className="text-[15px] font-extrabold text-[var(--color-text)]">
                  {displayReport.address}
                </div>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {totalFollowers} người cùng báo vấn đề này
                </p>
              </div>

              {isOpenForFollow && (
                <button
                  type="button"
                  disabled={hasFollowed}
                  onClick={handleFollowIssue}
                  className={`flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-extrabold transition-all ${
                    hasFollowed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0084E8] hover:border-[#0084E8] hover:bg-[#E0F2FE] active:scale-[0.99] dark:border-sky-800 dark:bg-sky-950/50 dark:text-[#38BDF8]'
                  }`}
                >
                  {hasFollowed ? 'Bạn đã báo vấn đề này' : 'Tôi cũng gặp vấn đề này'}
                </button>
              )}
            </section>

            {/* 2. "Vấn đề đã được giải quyết chưa?" Rating & Action Card (Chỉ chủ phản ánh & cần đăng nhập, ẩn sau khi đã xác nhận) */}
            {/* AC-C06-14: chưa đăng nhập thấy lời mời đăng nhập; đã đăng nhập nhưng không phải người gửi thì không thấy */}
            {rawReport.status === 'hoan_thanh' &&
              !rawReport.feedback &&
              (isOwner || !state.settings.phone) && (
                <section
                  aria-label="Đánh giá kết quả xử lý"
                  className="rounded-3xl border border-[#BAE6FD] bg-[#F0F9FF] p-5 shadow-2xs space-y-3.5 dark:border-sky-800 dark:bg-sky-950/40"
                >
                  <h2 className="text-[15px] font-extrabold text-[var(--color-text)]">
                    Vấn đề đã được giải quyết chưa?
                  </h2>

                  {!state.settings.phone ? (
                    <div className="space-y-3 rounded-2xl bg-white/80 p-4 text-center dark:bg-slate-900/60">
                      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                        Vui lòng đăng nhập bằng số điện thoại để xác nhận kết quả và đánh giá mức độ
                        hài lòng.
                      </p>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setIsRatingAuthOpen(true)}
                        className="w-full min-h-[var(--tap)]"
                      >
                        Đăng nhập để đánh giá
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* 5 Interactive Stars */}
                      <div className="flex flex-col items-center rounded-2xl bg-white/80 py-2.5 dark:bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= inlineRating;
                            return (
                              <button
                                key={star}
                                type="button"
                                aria-label={`Đánh giá ${star} sao`}
                                onClick={() => setInlineRating(star)}
                                className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8]"
                              >
                                <Star
                                  className={`h-7 w-7 transition-colors ${
                                    active
                                      ? 'fill-[#F59E0B] text-[#F59E0B]'
                                      : 'fill-slate-200 text-slate-300 hover:text-amber-300 dark:fill-slate-700 dark:text-slate-600'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-1 text-xs font-bold text-[#0084E8] dark:text-[#38BDF8]">
                          {inlineRating > 0
                            ? `${inlineRating}/5 sao · ${INLINE_RATING_LABELS[inlineRating]} (Chạm để chọn)`
                            : 'Chạm để chọn mức độ hài lòng'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            if (rawReport.status === 'hoan_thanh') {
                              if (inlineRating > 0) {
                                handleRatingSubmit({ rating: inlineRating, tags: [] });
                              } else {
                                setIsRatingOpen(true);
                              }
                            } else {
                              setToast({
                                message: `Cảm ơn bạn đã xác nhận đã giải quyết (${inlineRating || 5}/5 sao)!`,
                                type: 'success',
                              });
                            }
                          }}
                          className="flex h-11 items-center justify-center rounded-xl bg-[#15803D] px-4 text-sm font-extrabold text-white shadow-2xs transition hover:bg-[#166534] disabled:opacity-50"
                        >
                          Đã giải quyết
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setIsReopenOpen(true)}
                          className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          Chưa giải quyết
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )}

            {/* 3. Khối hành động chủ hồ sơ khi cần bổ sung (AC-C06-7) */}
            {isOwner && rawReport.status === 'can_bo_sung' && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 space-y-3 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  Phường cần thêm ảnh hoặc vị trí rõ hơn để tiếp tục xử lý.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSupplement}
                  className="w-full min-h-[var(--btn-h)]"
                >
                  Bổ sung ngay
                </Button>
              </section>
            )}

            {/* 4. Compact Bullet Timeline Card ("Lịch sử cập nhật") */}
            {reverseTimeline.length > 0 && (
              <section
                aria-label="Lịch sử cập nhật"
                className="rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs space-y-2.5 dark:border-slate-800"
              >
                <h2 className="text-[15px] font-extrabold text-[var(--color-text)]">
                  Lịch sử cập nhật
                </h2>

                <ul className="space-y-1.5">
                  {reverseTimeline.map((entry, idx) => (
                    <li
                      key={`${entry.at}-${entry.status}-${idx}`}
                      className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-500 dark:bg-slate-400" />
                      <span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {formatShortTime(entry.at)}
                        </span>{' '}
                        · {formatTimelineEntryText(entry, displayReport)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 5. Owner Card: SubscribeCard (chỉ hiển thị khi đã đăng nhập) */}
            {isOwner && rawReport.anonymous && Boolean(state.settings.phone) && (
              <SubscribeCard
                reportId={rawReport.id}
                currentPhone={subscribedPhone}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal Chia sẻ phản ánh & Mã QR (Lucian #478) */}
      <Modal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title={`Chia sẻ phản ánh #${displayReport.id}`}
      >
        <div className="space-y-4 text-center">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0084E8] dark:bg-sky-950/60 dark:text-[#38BDF8]">
                <CategoryIcon category={displayReport.category} className="h-3 w-3" />
                {catConfig.label}
              </span>
              <StatusChip status={displayReport.status} />
            </div>
            <div className="mt-2 text-sm font-extrabold text-[var(--color-text)] line-clamp-1">
              {displayReport.title || displayReport.description || catConfig.label}
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {displayReport.address}
            </div>
          </div>

          <QrShareCard
            url={shareTrackingUrl}
            title={`Trấn Biên Kết Nối – #${displayReport.id}`}
            text={`Phản ánh #${displayReport.id} tại ${displayReport.address}`}
            copyLabel="Sao chép liên kết"
            copiedLabel="Đã sao chép"
          />

          <div className="rounded-2xl border border-sky-200/70 bg-sky-50/60 p-3 text-left text-xs text-slate-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-slate-300 space-y-1">
            <div className="font-bold text-[var(--color-text)]">Hướng dẫn quét nhanh</div>
            <p>1. Mở Camera hoặc nút Quét QR trong ứng dụng Trấn Biên Kết Nối.</p>
            <p>2. Đưa mã QR vào khung hình để mở ngay trang theo dõi tiến độ.</p>
          </div>
        </div>
      </Modal>

      <PhoneOtpSheet
        isOpen={isRatingAuthOpen}
        onClose={() => setIsRatingAuthOpen(false)}
        onVerified={(phone) => {
          dispatch({ type: 'SET_SETTINGS', payload: { phone } });
          setIsRatingAuthOpen(false);
          setToast({ message: 'Đăng nhập thành công! Bạn có thể đánh giá ngay.', type: 'success' });
        }}
      />

      {/* Modal phóng to ảnh (AC-C06-4) */}
      <Modal
        isOpen={Boolean(zoomedPhoto)}
        onClose={() => setZoomedPhoto(null)}
        title={zoomedPhoto?.alt || 'Xem ảnh'}
        className="max-w-2xl"
      >
        {zoomedPhoto && (
          <div className="flex flex-col items-center">
            <img
              src={zoomedPhoto.src}
              alt={zoomedPhoto.alt}
              className="max-h-[75vh] w-full rounded-2xl object-contain bg-slate-950"
            />
          </div>
        )}
      </Modal>

      {/* Sheet đánh giá 5 sao (AC-C06-5) */}
      <RatingSheet
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        onSubmit={handleRatingSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Sheet báo chưa giải quyết (AC-C06-5) */}
      <BottomSheet
        isOpen={isReopenOpen}
        onClose={() => setIsReopenOpen(false)}
        title="Điều gì chưa ổn?"
      >
        <form onSubmit={handleReopenSubmit} className="space-y-4 pt-1">
          {/* Workflow clarity */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
            Phản ánh sẽ được <strong>mở lại</strong> và chuyển ngay cho cán bộ &amp; tình nguyện
            viên kiểm tra lại hiện trường.
          </div>

          {/* Quick Reason Chips */}
          <div>
            <div className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">
              Chọn nhanh lý do (tuỳ chọn)
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                'Chưa khắc phục xong',
                'Sự cố tái diễn',
                'Xử lý chưa sạch / an toàn',
                'Sai vị trí cần sửa',
              ].map((reason) => {
                const selected = reopenNote.includes(reason);
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() =>
                      setReopenNote((prev) =>
                        selected
                          ? prev
                              .replace(reason, '')
                              .replace(/^[,\s]+|[,\s]+$/g, '')
                              .trim()
                          : prev.trim()
                            ? `${prev.trim()}, ${reason}`
                            : reason
                      )
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                      selected
                        ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                        : 'border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="reopen-note"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-text-muted)]"
            >
              Ghi chú tình trạng hiện tại (tuỳ chọn)
            </label>
            <textarea
              id="reopen-note"
              rows={3}
              value={reopenNote}
              onChange={(e) => setReopenNote(e.target.value)}
              placeholder="Ví dụ: Đèn vẫn tắt vào buổi tối, mặt đường còn ổ gà..."
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
              Ảnh / Video hiện trạng (chụp trực tiếp bằng camera, tuỳ chọn)
            </div>
            <MediaCaptureField
              items={reopenMedia}
              onChange={setReopenMedia}
              maxItems={5}
              allowGallery={false}
              allowVideo={true}
              captureLabel="Mở camera chụp ảnh / quay video"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full min-h-[var(--btn-h)]"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi & Mở lại hồ sơ'}
          </Button>
        </form>
      </BottomSheet>
    </CitizenLayout>
  );
}
