import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Wrench,
  GitMerge,
  Split,
  ArrowLeft,
  Send,
  FileText,
  XCircle,
  Camera,
} from 'lucide-react';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { SelectField } from '@/components/ui';
import { useAppStore } from '@/store/AppStore';
import {
  acceptReport,
  assignVolunteer,
  assignDepartment,
  requestSupplement,
  closeReport,
  mergeReports,
  splitReportAction,
  getCategoryConfig,
} from '@/store/officerActions';
import { canTransition, transition } from '@/domain/status';
import {
  CATEGORY_CONFIGS,
  DEPARTMENTS,
  VOLUNTEERS,
  DEFAULT_OFFICER,
  officerLabel,
} from '@/domain/constants';
import { CATEGORIES, Category, Priority, Report } from '@/domain/types';
import { MediaItemPreview } from '@/components/common/MediaCapture';
import { findDuplicates } from '@/domain/duplicates';
import { formatDateTime, formatDistance } from '@/domain/format';
import { isOverdue } from '@/domain/sorting';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

export interface A02PanelProps {
  reportId?: string;
  onClose?: () => void;
  embedded?: boolean;
}

type ExceptionMode = 'can_bo_sung' | 'khong_xac_nhan' | 'dong' | null;

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Chuyển sang múi giờ +07:00 để lấy YYYY-MM-DD chính xác
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

function dateInputToIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  return `${dateStr}T17:00:00+07:00`;
}

function computeDefaultDueIso(report: Report, cat: Category): string {
  const cfg = getCategoryConfig(cat);
  const createdMs = new Date(report.createdAt).getTime();
  return new Date(createdMs + cfg.defaultDays * 24 * 60 * 60 * 1000).toISOString();
}

export function A02Panel({
  reportId: propReportId,
  onClose,
  embedded = false,
}: A02PanelProps = {}) {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const targetId = propReportId ?? params.id;
  const report = state.reports.find((r) => r.id === targetId);

  const [activeTab, setActiveTab] = useState<'chi_tiet' | 'lich_su'>('chi_tiet');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Trường chỉnh sửa (AC-A02-2)
  const [category, setCategory] = useState<Category>(report?.category ?? 'mat_duong');
  const [priority, setPriority] = useState<Priority>(report?.priority ?? 'binh_thuong');
  const [department, setDepartment] = useState<string>(
    report?.department ??
      (report ? getCategoryConfig(report.category).suggestedDepartment : DEPARTMENTS[0])
  );
  const [dueDate, setDueDate] = useState<string>(
    report ? toDateInputValue(report.dueAt ?? computeDefaultDueIso(report, report.category)) : ''
  );

  // Modals
  const [showTnvModal, setShowTnvModal] = useState(false);
  const [selectedTnv, setSelectedTnv] = useState<string>(VOLUNTEERS[0]);
  const [tnvMode, setTnvMode] = useState<'specific' | 'open'>('specific');

  const [exceptionMode, setExceptionMode] = useState<ExceptionMode>(null);
  const [exceptionReason, setExceptionReason] = useState('');

  const [mergeTarget, setMergeTarget] = useState<Report | null>(null);
  const [splitTargetId, setSplitTargetId] = useState<string | null>(null);

  const handleClose = useMemo(
    () => () => {
      if (onClose) {
        onClose();
      } else {
        navigate('/can-bo');
      }
    },
    [onClose, navigate]
  );

  // Đồng bộ form khi đổi hồ sơ
  const reportIdVal = report?.id;
  const reportCategory = report?.category;
  const reportPriority = report?.priority;
  const reportDepartment = report?.department;
  const reportDueAt = report?.dueAt;
  const reportCreatedAt = report?.createdAt;

  useEffect(() => {
    if (!reportIdVal || !reportCategory || !reportPriority || !reportCreatedAt) return;
    setCategory(reportCategory);
    setPriority(reportPriority);
    setDepartment(reportDepartment ?? getCategoryConfig(reportCategory).suggestedDepartment);
    const defaultDue = new Date(
      new Date(reportCreatedAt).getTime() +
        getCategoryConfig(reportCategory).defaultDays * 24 * 60 * 60 * 1000
    ).toISOString();
    setDueDate(toDateInputValue(reportDueAt ?? defaultDue));
    setPhotoIndex(0);
    setActiveTab('chi_tiet');
  }, [reportIdVal, reportCategory, reportPriority, reportDepartment, reportDueAt, reportCreatedAt]);

  // Phím Esc đóng panel khi không mở modal
  const hasOpenModal = Boolean(showTnvModal || exceptionMode || mergeTarget || splitTargetId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hasOpenModal) {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasOpenModal, handleClose]);

  const now = state.settings.demoNow;

  // Nhiệm vụ TNV mới nhất đã hoàn thành (AC-A02-5)
  const completedTask = useMemo(() => {
    if (!reportIdVal) return undefined;
    return state.volunteerTasks.find(
      (t) => t.reportId === reportIdVal && t.status === 'xong' && Boolean(t.result)
    );
  }, [state.volunteerTasks, reportIdVal]);

  // Phản ánh tương tự (AC-A02-6)
  const duplicates = useMemo(() => {
    if (!report || report.status === 'dong' || report.status === 'da_gop') return [];
    return findDuplicates(
      { id: report.id, category: report.category, lat: report.lat, lng: report.lng },
      state.reports,
      now
    );
  }, [report, state.reports, now]);

  const showSuccess = (message: string) => {
    setToast({ message, type: 'success' });
  };

  const handleCategoryChange = (nextCat: Category) => {
    setCategory(nextCat);
    if (report && (report.status === 'moi' || !report.department)) {
      const cfg = getCategoryConfig(nextCat);
      setDepartment(cfg.suggestedDepartment);
      setDueDate(toDateInputValue(computeDefaultDueIso(report, nextCat)));
    }
  };

  const handleSaveMetadata = () => {
    if (!report) return;
    const updated: Report = {
      ...report,
      category,
      priority,
      department,
      dueAt: dueDate ? dateInputToIso(dueDate) : report.dueAt,
    };
    dispatch({ type: 'UPDATE_REPORT', payload: { report: updated } });
    showSuccess('Đã cập nhật thông tin phân loại và hạn xử lý');
  };

  const handleAccept = () => {
    if (!report) return;
    const dueIso = dueDate ? dateInputToIso(dueDate) : undefined;
    const nextState = acceptReport(
      state,
      report.id,
      {
        category,
        department,
        dueAt: dueIso,
        actor: DEFAULT_OFFICER,
      },
      now
    );
    const syncedReports = nextState.reports.map((r) =>
      r.id === report.id ? { ...r, priority } : r
    );
    dispatch({ type: 'HYDRATE', payload: { ...nextState, reports: syncedReports } });
    showSuccess(`Đã tiếp nhận hồ sơ ${report.id}`);
  };

  const handleAssignDepartment = () => {
    if (!report) return;
    const dueIso = dueDate ? dateInputToIso(dueDate) : undefined;
    const nextState = assignDepartment(
      state,
      report.id,
      {
        department,
        dueAt: dueIso,
        actor: DEFAULT_OFFICER,
      },
      now
    );
    const syncedReports = nextState.reports.map((r) =>
      r.id === report.id ? { ...r, category, priority } : r
    );
    dispatch({ type: 'HYDRATE', payload: { ...nextState, reports: syncedReports } });
    showSuccess(`Đã giao ${department}`);
  };

  const handleConfirmTnv = () => {
    if (!report) return;
    const assignee = tnvMode === 'specific' ? selectedTnv : null;
    const nextState = assignVolunteer(state, report.id, { assignee, actor: DEFAULT_OFFICER }, now);
    dispatch({ type: 'HYDRATE', payload: nextState });
    setShowTnvModal(false);
    showSuccess(
      assignee ? `Đã giao TNV ${assignee} xác minh` : 'Đã mở nhiệm vụ cho TNV gần nhất nhận'
    );
  };

  const openExceptionModal = (mode: Exclude<ExceptionMode, null>) => {
    setExceptionMode(mode);
    setExceptionReason('');
  };

  const handleConfirmException = () => {
    if (!report || !exceptionMode) return;
    const trimmedReason = exceptionReason.trim();
    if (trimmedReason.length < 10) return;

    if (exceptionMode === 'can_bo_sung') {
      const nextState = requestSupplement(
        state,
        report.id,
        { reason: trimmedReason, actor: DEFAULT_OFFICER },
        now
      );
      dispatch({ type: 'HYDRATE', payload: nextState });
      showSuccess('Đã gửi yêu cầu bổ sung thông tin');
    } else if (exceptionMode === 'dong') {
      const nextState = closeReport(
        state,
        report.id,
        { reason: trimmedReason, actor: DEFAULT_OFFICER },
        now
      );
      dispatch({ type: 'HYDRATE', payload: nextState });
      showSuccess('Đã đóng hồ sơ');
    } else if (exceptionMode === 'khong_xac_nhan') {
      const { report: updated } = transition(report, 'khong_xac_nhan', 'CB', DEFAULT_OFFICER, now, {
        note: trimmedReason,
      });
      dispatch({ type: 'UPDATE_REPORT', payload: { report: updated } });
      showSuccess('Đã cập nhật trạng thái Không xác nhận được');
    }

    setExceptionMode(null);
  };

  const handleConfirmMerge = () => {
    if (!report || !mergeTarget) return;
    const nextState = mergeReports(
      state,
      report.id,
      [mergeTarget.id],
      { actor: DEFAULT_OFFICER },
      now
    );
    dispatch({ type: 'HYDRATE', payload: nextState });
    showSuccess(`Đã gộp ${mergeTarget.id} vào ${report.id}`);
    setMergeTarget(null);
  };

  const handleConfirmSplit = () => {
    if (!report || !splitTargetId) return;
    const nextState = splitReportAction(
      state,
      report.id,
      splitTargetId,
      { actor: DEFAULT_OFFICER },
      now
    );
    dispatch({ type: 'HYDRATE', payload: nextState });
    showSuccess(`Đã tách hồ sơ ${splitTargetId}`);
    setSplitTargetId(null);
  };

  const renderPanelContent = () => {
    if (!report) {
      return (
        <div className="flex h-full flex-col bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h1
              data-testid="screen-title"
              className="text-lg font-semibold text-[var(--color-text)]"
            >
              Chi tiết & Giao xử lý
            </h1>
            <Button variant="ghost" size="sm" onClick={handleClose} aria-label="Đóng">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Không tìm thấy hồ sơ"
              description={`Mã hồ sơ ${targetId ?? ''} không tồn tại trong hệ thống.`}
              actionText="Quay lại hộp tiếp nhận"
              onAction={handleClose}
            />
          </div>
        </div>
      );
    }

    const photos = report.photos ?? [];
    const safePhotoIdx = Math.min(photoIndex, Math.max(0, photos.length - 1));
    const currentPhoto = photos[safePhotoIdx];
    const followerCount = (report.followers?.length ?? 0) + (report.anonymousFollows ?? 0);
    const overdue = isOverdue(report, now);

    const canAccept = canTransition(report.status, 'da_tiep_nhan', 'CB');
    const canAssignTnv = canTransition(report.status, 'cho_xac_minh', 'CB');
    const canAssignDept = canTransition(report.status, 'da_giao', 'CB');
    const canComplete =
      canTransition(report.status, 'hoan_thanh', 'CB') || report.status === 'mo_lai';
    const canSupplement = canTransition(report.status, 'can_bo_sung', 'CB');
    const canClose = canTransition(report.status, 'dong', 'CB');
    const canRejectVerify = canTransition(report.status, 'khong_xac_nhan', 'CB');

    const exceptionTitleMap: Record<Exclude<ExceptionMode, null>, string> = {
      can_bo_sung: 'Yêu cầu người dân bổ sung thông tin',
      khong_xac_nhan: 'Xác nhận không phát hiện sự cố',
      dong: 'Đóng hồ sơ phản ánh',
    };

    const officerStageIndex = ['hoan_thanh', 'dong'].includes(report.status)
      ? 4
      : ['da_giao', 'mo_lai'].includes(report.status)
        ? 3
        : ['da_tiep_nhan', 'cho_xac_minh', 'can_bo_sung'].includes(report.status)
          ? 2
          : 1;

    const workflowStages = [
      { step: 1, label: 'Tiếp nhận' },
      { step: 2, label: 'Xác minh' },
      { step: 3, label: 'Giao xử lý' },
      { step: 4, label: 'Hoàn thành' },
    ];

    return (
      <aside
        data-testid="a02-panel"
        className="flex h-full w-full flex-col bg-[#F4F8FC] dark:bg-[var(--color-bg)]"
      >
        {/* Clean Full-Width Header matching C04Confirm */}
        <div className="border-b border-slate-200/80 bg-[var(--color-surface)] px-4 md:px-6 py-3.5 dark:border-slate-800">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {!embedded && (
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Quay lại hộp tiếp nhận"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    data-testid="report-id"
                    className="text-base sm:text-lg font-extrabold text-[#0084E8]"
                  >
                    {report.id}
                  </span>
                  <StatusChip status={report.status} variant="officer" size="sm" />
                  {overdue && <DelayChip report={report} now={now} />}
                </div>
                <h1
                  data-testid="screen-title"
                  className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-text-muted)]"
                >
                  Chi tiết &amp; Giao xử lý
                </h1>
              </div>
            </div>

            {embedded && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  aria-label="Đóng panel (Esc)"
                  title="Đóng (Esc)"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6 pt-3">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}

        {/* Main 12-Col Body matching C04Confirm */}
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-6 py-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Tabs
              tabs={[
                { id: 'chi_tiet', label: 'Chi tiết' },
                { id: 'lich_su', label: 'Lịch sử', count: report.timeline.length },
              ]}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'chi_tiet' | 'lich_su')}
            />
          </div>

          {activeTab === 'chi_tiet' ? (
            <>
              {/* Banner đã gộp */}
              {report.status === 'da_gop' && report.mergedInto && (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-950 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200">
                  <div className="flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>
                      Hồ sơ đã được gộp vào <strong>#{report.mergedInto}</strong>
                    </span>
                  </div>
                  <Link
                    to={`/can-bo/${report.mergedInto}`}
                    className="text-xs font-semibold text-purple-700 dark:text-purple-300 underline"
                  >
                    Mở hồ sơ chính
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 sm:p-5 shadow-sm space-y-4 dark:border-slate-800">
                  {/* Gallery ảnh (AC-A02-1) */}
                  <div className="space-y-2">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-950">
                      {currentPhoto ? (
                        <MediaItemPreview
                          src={currentPhoto}
                          alt={`Ảnh hiện trường ${safePhotoIdx + 1}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-text-sub">
                          Không có ảnh đính kèm
                        </div>
                      )}

                      {photos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                            }
                            aria-label="Ảnh trước"
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                            aria-label="Ảnh sau"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
                            {safePhotoIdx + 1} / {photos.length}
                          </span>
                        </>
                      )}
                    </div>

                    {photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.map((src, idx) => (
                          <button
                            key={`${src}-${idx}`}
                            type="button"
                            onClick={() => setPhotoIndex(idx)}
                            aria-label={`Xem ảnh ${idx + 1}`}
                            className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                              idx === safePhotoIdx
                                ? 'border-primary'
                                : 'border-transparent opacity-70'
                            }`}
                          >
                            <img
                              src={src}
                              alt={`Thumbnail ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bản đồ nhỏ (AC-A02-1) */}
                  <div className="h-48 md:h-56 w-full overflow-hidden rounded-card border border-[var(--color-border)]">
                    <MapView
                      center={[report.lat, report.lng]}
                      zoom={16}
                      autoLocateUser={true}
                      showLocateButton={true}
                      hideBuiltInLegend={true}
                      markers={[
                        {
                          id: report.id,
                          lat: report.lat,
                          lng: report.lng,
                          category: report.category,
                          status: report.status,
                        },
                      ]}
                    />
                  </div>

                  {/* Thông tin cơ bản & Riêng tư (AC-A02-1) */}
                  <div className="space-y-2.5 rounded-card border border-slate-200 bg-slate-50 p-3.5 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <div className="font-medium text-text-main">{report.address}</div>
                        {report.locationNote && (
                          <div className="text-xs text-text-sub mt-0.5">{report.locationNote}</div>
                        )}
                      </div>
                    </div>

                    {(report.title || report.description) && (
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-sub" />
                        <div className="space-y-1">
                          {report.title && (
                            <div className="font-bold text-text-main">{report.title}</div>
                          )}
                          {report.description && (
                            <p className="text-text-main">{report.description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)] text-xs text-text-sub">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {report.anonymous ? (
                          <span className="font-medium text-[var(--color-text)]">
                            {report.subscribedLater ? 'Ẩn danh · đã đăng ký nhận tin' : 'Ẩn danh'}
                          </span>
                        ) : (
                          <span className="font-semibold text-[var(--color-text)] tabular-nums">
                            {report.reporterPhone || 'Chưa có SĐT'}
                          </span>
                        )}
                        {report.onBehalf && (
                          <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            Gửi hộ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 font-medium text-[var(--color-text)]">
                        <Users className="h-3.5 w-3.5" />
                        <span>{followerCount} người cùng báo</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-text-sub">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Gửi lúc: {formatDateTime(report.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 lg:sticky lg:top-4 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-sm space-y-5 dark:border-slate-800">
                  {/* 4-Step Officer Pill Bar matching C04Confirm */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
                    {workflowStages.map((stage) => {
                      const isDone = officerStageIndex > stage.step || officerStageIndex === 4;
                      const isCurrent = officerStageIndex === stage.step && officerStageIndex < 4;
                      return (
                        <div
                          key={stage.step}
                          className={`flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-[#0084E8] text-white shadow-sm'
                              : isDone
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                              isCurrent
                                ? 'bg-white text-[#0084E8]'
                                : isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {stage.step}
                          </span>
                          <span className="truncate">{stage.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Trường phân loại & giao xử lý (AC-A02-2) */}
                  <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-text-main">
                        Phân loại & Hạn xử lý
                      </h2>
                      {report.status !== 'moi' && (
                        <Button variant="ghost" size="sm" onClick={handleSaveMetadata}>
                          Lưu thay đổi
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="a02-category"
                          className="mb-1 block text-xs font-medium text-text-sub"
                        >
                          Loại sự cố
                        </label>
                        <SelectField
                          id="a02-category"
                          size="sm"
                          value={category}
                          onChange={(e) => handleCategoryChange(e.target.value as Category)}
                        >
                          {CATEGORIES.map((c) => {
                            const cfg = CATEGORY_CONFIGS.find((item) => item.key === c);
                            return (
                              <option key={c} value={c}>
                                {cfg?.label ?? c}
                              </option>
                            );
                          })}
                        </SelectField>
                      </div>

                      <div>
                        <label
                          htmlFor="a02-priority"
                          className="mb-1 block text-xs font-medium text-text-sub"
                        >
                          Ưu tiên
                        </label>
                        <SelectField
                          id="a02-priority"
                          size="sm"
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Priority)}
                        >
                          <option value="binh_thuong">Bình thường</option>
                          <option value="cao">Cao</option>
                        </SelectField>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="a02-department"
                        className="mb-1 block text-xs font-medium text-text-sub"
                      >
                        Bộ phận xử lý
                      </label>
                      <SelectField
                        id="a02-department"
                        size="sm"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    <div>
                      <label
                        htmlFor="a02-due-date"
                        className="mb-1 block text-xs font-medium text-text-sub"
                      >
                        Hạn xử lý
                      </label>
                      <input
                        id="a02-due-date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm text-[var(--color-text)] focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Gợi ý xác minh cho hồ sơ ẩn danh ở trạng thái mới (AC-A02-10) */}
                  {report.anonymous && report.status === 'moi' && (
                    <div
                      data-testid="anonymous-verify-hint"
                      className="flex items-start gap-2.5 rounded-card border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        <strong>Hồ sơ ẩn danh:</strong> nên giao TNV xác minh trước khi xử lý
                      </span>
                    </div>
                  )}

                  {/* Nhóm nút thao tác theo trạng thái (AC-A02-3) */}
                  <div className="space-y-2.5 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Thao tác điều phối
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canAccept && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={handleAccept}
                        >
                          Tiếp nhận
                        </Button>
                      )}

                      {canAssignTnv && (
                        <Button
                          variant={
                            report.anonymous && report.status === 'moi' ? 'primary' : 'secondary'
                          }
                          size="sm"
                          icon={<UserCheck className="h-4 w-4" />}
                          onClick={() => setShowTnvModal(true)}
                        >
                          Giao TNV xác minh
                        </Button>
                      )}

                      {canAssignDept && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Wrench className="h-4 w-4" />}
                          onClick={handleAssignDepartment}
                        >
                          Giao xử lý
                        </Button>
                      )}

                      {canComplete && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Camera className="h-4 w-4" />}
                          onClick={() => navigate(`/can-bo/${report.id}/ket-qua`)}
                        >
                          Cập nhật kết quả
                        </Button>
                      )}

                      {canClose && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={() => openExceptionModal('dong')}
                        >
                          Đóng
                        </Button>
                      )}
                    </div>

                    {/* Nút ngoại lệ (AC-A02-8) */}
                    {(canSupplement || canRejectVerify) && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                        {canSupplement && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Send className="h-3.5 w-3.5" />}
                            onClick={() => openExceptionModal('can_bo_sung')}
                          >
                            Yêu cầu bổ sung
                          </Button>
                        )}
                        {canRejectVerify && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<XCircle className="h-3.5 w-3.5" />}
                            onClick={() => openExceptionModal('khong_xac_nhan')}
                          >
                            Không xác nhận được
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Khối Kết quả xác minh của TNV (AC-A02-5) */}
                  {completedTask?.result && (
                    <div
                      data-testid="tnv-verification-result"
                      className="space-y-2.5 rounded-card border border-blue-200 bg-blue-50/60 p-3.5 text-sm dark:border-blue-900/60 dark:bg-blue-950/35"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-blue-950 dark:text-blue-200">
                          {completedTask.type === 'nghiem_thu'
                            ? 'Kết quả nghiệm thu TNV'
                            : 'Kết quả xác minh'}
                        </h3>
                        <span className="text-xs text-blue-700 dark:text-blue-300">
                          {completedTask.assignee || 'Tình nguyện viên'} ·{' '}
                          {formatDateTime(completedTask.result.at)}
                        </span>
                      </div>

                      {completedTask.result.photo && (
                        <img
                          src={completedTask.result.photo}
                          alt="Ảnh xác minh của TNV"
                          className="h-36 w-full rounded-btn object-cover border border-blue-200 dark:border-blue-800"
                        />
                      )}

                      <div className="space-y-1 text-xs text-[var(--color-text)]">
                        <div>
                          <strong>1. Hiện trạng:</strong>{' '}
                          {completedTask.result.exists === 'co'
                            ? 'Có sự cố'
                            : completedTask.result.exists === 'khong'
                              ? 'Không có sự cố'
                              : 'Không tìm thấy vị trí'}
                        </div>
                        {completedTask.result.severity && (
                          <div>
                            <strong>2. Mức độ:</strong>{' '}
                            {completedTask.result.severity === 'nguy_hiem'
                              ? 'Nguy hiểm'
                              : completedTask.result.severity === 'trung_binh'
                                ? 'Trung bình'
                                : 'Nhẹ'}
                          </div>
                        )}
                        <div>
                          <strong>3. Ghi chú TNV:</strong>{' '}
                          {completedTask.result.note || 'Không có ghi chú thêm'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Khối Đã gộp & Tách (AC-A02-7) */}
                  {report.mergedChildren && report.mergedChildren.length > 0 && (
                    <div className="space-y-2 rounded-card border border-purple-200 bg-purple-50/50 p-3.5">
                      <h3 className="text-sm font-semibold text-purple-950">
                        Hồ sơ đã gộp ({report.mergedChildren.length})
                      </h3>
                      <div className="space-y-1.5">
                        {report.mergedChildren.map((childId) => (
                          <div
                            key={childId}
                            className="flex items-center justify-between rounded-btn bg-[var(--color-surface)] px-3 py-2 text-xs border border-purple-200 dark:border-purple-800/60"
                          >
                            <span className="font-semibold text-purple-900">#{childId}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Split className="h-3.5 w-3.5" />}
                              onClick={() => setSplitTargetId(childId)}
                            >
                              Tách
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Khối Phản ánh tương tự (AC-A02-6) */}
                  {duplicates.length > 0 && (
                    <div
                      data-testid="similar-reports-block"
                      className="space-y-2.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"
                    >
                      <h3 className="text-sm font-semibold text-text-main">
                        Phản ánh tương tự ({duplicates.length})
                      </h3>
                      <div className="space-y-2">
                        {duplicates.map(({ report: dup, distanceMeters }) => (
                          <div
                            key={dup.id}
                            className="flex items-center gap-3 rounded-btn border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5"
                          >
                            {dup.photos[0] && (
                              <img
                                src={dup.photos[0]}
                                alt={dup.id}
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-primary">{dup.id}</span>
                                <span className="text-text-sub">
                                  cách {formatDistance(distanceMeters)}
                                </span>
                              </div>
                              <div className="truncate text-xs text-text-main">{dup.address}</div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<GitMerge className="h-3.5 w-3.5" />}
                              onClick={() => setMergeTarget(dup)}
                            >
                              Gộp vào hồ sơ này
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Tab Lịch sử nội bộ (AC-A02-9) */
            <div data-testid="officer-history-tab" className="space-y-3">
              {[...report.timeline].reverse().map((entry, idx) => (
                <div
                  key={`${entry.at}-${idx}`}
                  className="rounded-card border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text-main">
                      {officerLabel(entry.status)}
                    </span>
                    <span className="text-xs text-text-sub">{formatDateTime(entry.at)}</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-primary">{entry.actor}</div>
                  {entry.note && <div className="mt-1 text-xs text-text-sub">{entry.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Giao TNV xác minh (AC-A02-4) */}
        <Modal
          isOpen={showTnvModal}
          onClose={() => setShowTnvModal(false)}
          title="Giao TNV xác minh tại chỗ"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowTnvModal(false)}>
                Huỷ
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmTnv}>
                Xác nhận giao
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2.5 rounded-btn border border-slate-200 p-3 cursor-pointer">
              <input
                type="radio"
                name="tnv-mode"
                checked={tnvMode === 'specific'}
                onChange={() => setTnvMode('specific')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-text-main">Chọn tình nguyện viên cụ thể</div>
                <SelectField
                  size="sm"
                  wrapperClassName="mt-2"
                  value={selectedTnv}
                  onChange={(e) => {
                    setSelectedTnv(e.target.value);
                    setTnvMode('specific');
                  }}
                >
                  {VOLUNTEERS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </SelectField>
              </div>
            </label>

            <label className="flex items-center gap-2.5 rounded-btn border border-slate-200 p-3 cursor-pointer">
              <input
                type="radio"
                name="tnv-mode"
                checked={tnvMode === 'open'}
                onChange={() => setTnvMode('open')}
              />
              <span className="font-medium text-text-main">Để TNV gần nhất nhận</span>
            </label>
          </div>
        </Modal>

        {/* Modal Ngoại lệ (AC-A02-8, AC-A02-10) */}
        <Modal
          isOpen={Boolean(exceptionMode)}
          onClose={() => setExceptionMode(null)}
          title={exceptionMode ? exceptionTitleMap[exceptionMode] : ''}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setExceptionMode(null)}>
                Huỷ
              </Button>
              <Button
                variant={exceptionMode === 'khong_xac_nhan' ? 'danger' : 'primary'}
                size="sm"
                disabled={exceptionReason.trim().length < 10}
                onClick={handleConfirmException}
              >
                Xác nhận
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            {exceptionMode === 'can_bo_sung' && report.anonymous && !report.subscribedLater && (
              <div className="flex items-start gap-2 rounded-btn border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>Người gửi sẽ chỉ thấy yêu cầu khi tự mở hồ sơ</span>
              </div>
            )}

            <div>
              <label
                htmlFor="exception-reason"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Lý do (tối thiểu 10 ký tự)
              </label>
              <textarea
                id="exception-reason"
                rows={3}
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full rounded-card border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-xs">
                <span
                  className={
                    exceptionReason.trim().length < 10 ? 'text-amber-700' : 'text-emerald-700'
                  }
                >
                  {exceptionReason.trim().length < 10
                    ? `Cần thêm ${10 - exceptionReason.trim().length} ký tự`
                    : 'Đạt yêu cầu'}
                </span>
                <span className="text-text-sub">{exceptionReason.trim().length} ký tự</span>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal Xác nhận gộp (AC-A02-6, AC-A02-7) */}
        <Modal
          isOpen={Boolean(mergeTarget)}
          onClose={() => setMergeTarget(null)}
          title="Xác nhận gộp hồ sơ trùng"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setMergeTarget(null)}>
                Huỷ
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmMerge}>
                Xác nhận gộp
              </Button>
            </>
          }
        >
          {mergeTarget && (
            <div className="space-y-2 text-sm">
              <p>Bạn có chắc muốn gộp hai hồ sơ sau?</p>
              <div className="rounded-btn bg-slate-50 p-3 text-xs space-y-1 border border-slate-200">
                <div>
                  <strong>Hồ sơ chính (giữ lại):</strong> #{report.id} – {report.address}
                </div>
                <div>
                  <strong>Hồ sơ bị gộp (chuyển sang Đã gộp):</strong> #{mergeTarget.id} –{' '}
                  {mergeTarget.address}
                </div>
              </div>
              <p className="text-xs text-text-sub">
                Ảnh và người theo dõi của #{mergeTarget.id} sẽ được chuyển sang #{report.id}.
              </p>
            </div>
          )}
        </Modal>

        {/* Modal Xác nhận tách (AC-A02-7) */}
        <Modal
          isOpen={Boolean(splitTargetId)}
          onClose={() => setSplitTargetId(null)}
          title="Xác nhận tách hồ sơ"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setSplitTargetId(null)}>
                Huỷ
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmSplit}>
                Xác nhận tách
              </Button>
            </>
          }
        >
          <p className="text-sm">
            Tách hồ sơ <strong>#{splitTargetId}</strong> khỏi hồ sơ chính{' '}
            <strong>#{report.id}</strong> và khôi phục trạng thái trước khi gộp?
          </p>
        </Modal>
      </aside>
    );
  };

  if (embedded) {
    return renderPanelContent();
  }

  return (
    <OfficerLayout>
      <div className="w-full">{renderPanelContent()}</div>
    </OfficerLayout>
  );
}
