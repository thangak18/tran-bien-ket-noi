import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { Button, Card, Chip, EmptyState, Toast } from '@/components/ui';
import { MediaCaptureField, MediaItemPreview } from '@/components/common/MediaCapture';
import { showLocalBrowserNotification } from '@/lib/webPush';
import { MapView } from '@/components/map/MapView';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { formatDateTime } from '@/domain/format';
import { useAppStore } from '@/store/AppStore';
import { submitVerification } from '@/store/officerActions';
import { V01Tasks } from './V01Tasks';

type ExistsOption = 'co' | 'khong' | 'khong_tim_thay';
type SeverityOption = 'nhe' | 'trung_binh' | 'nguy_hiem';

const EXISTS_OPTIONS: { value: ExistsOption; label: string }[] = [
  { value: 'co', label: 'Có' },
  { value: 'khong', label: 'Không' },
  { value: 'khong_tim_thay', label: 'Không tìm thấy vị trí' },
];

const SEVERITY_OPTIONS: { value: SeverityOption; label: string }[] = [
  { value: 'nhe', label: 'Nhẹ' },
  { value: 'trung_binh', label: 'Trung bình' },
  { value: 'nguy_hiem', label: 'Nguy hiểm' },
];

export function V02Verify() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const task = state.volunteerTasks.find((t) => t.id === taskId);
  const report = task ? state.reports.find((r) => r.id === task.reportId) : undefined;

  const [exists, setExists] = useState<ExistsOption | null>(task?.result?.exists ?? null);
  const [severity, setSeverity] = useState<SeverityOption | null>(task?.result?.severity ?? null);
  const [mediaItems, setMediaItems] = useState<string[]>(
    task?.result?.photo ? [task.result.photo] : []
  );
  const photo = mediaItems[0] ?? '';
  const [note, setNote] = useState<string>(task?.result?.note ?? '');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (taskId === 'ban-do' || taskId === 'ho-so') {
    return <V01Tasks />;
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/tnv');
    }
  };

  if (!task || !report) {
    return (
      <VolunteerLayout>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Quay lại danh sách nhiệm vụ"
              icon={<ArrowLeft className="h-5 w-5" />}
              onClick={handleBack}
            >
              Quay lại
            </Button>
          </div>
          <h1 data-testid="screen-title" className="text-[var(--fs-title)] font-bold text-gray-900">
            Xác minh tại chỗ
          </h1>
          <EmptyState
            icon={<ClipboardList />}
            title="Không tìm thấy nhiệm vụ"
            description="Nhiệm vụ này không tồn tại hoặc đã bị xoá khỏi dữ liệu."
            actionText="Về danh sách nhiệm vụ"
            onAction={() => navigate('/tnv')}
          />
        </div>
      </VolunteerLayout>
    );
  }

  const categoryLabel = CATEGORY_CONFIGS.find((c) => c.key === report.category)?.label ?? 'Sự cố';
  const isCompleted = task.status === 'xong';
  const isInspection = task.type === 'nghiem_thu';
  const directionsUrl = `https://www.openstreetmap.org/directions?from=&to=${encodeURIComponent(
    `${report.lat},${report.lng}`
  )}`;

  const reopenReason =
    report.feedback?.comment?.trim() ||
    [...report.timeline].reverse().find((t) => t.status === 'mo_lai')?.note ||
    'Người dân phản hồi sự cố chưa được xử lý triệt để.';

  const canSubmit =
    !isCompleted && exists !== null && (exists !== 'co' || severity !== null) && photo.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exists) {
      setErrorMessage('Vui lòng chọn kết quả Câu 1.');
      return;
    }
    if (exists === 'co' && !severity) {
      setErrorMessage('Vui lòng chọn mức độ sự cố ở Câu 2.');
      return;
    }
    if (!photo) {
      setErrorMessage('Vui lòng chụp hoặc tải lên ảnh tại chỗ ở Câu 3.');
      return;
    }

    const nextState = submitVerification(
      state,
      task.id,
      {
        exists,
        severity: exists === 'co' ? (severity ?? undefined) : undefined,
        photo,
        note: note.trim() || undefined,
      },
      state.settings.demoNow
    );

    dispatch({ type: 'HYDRATE', payload: nextState });
    showLocalBrowserNotification(
      '✅ TNV đã xác minh xong',
      `Hồ sơ ${report.id} (${report.address}) đã có kết quả xác minh. Cán bộ có thể giao xử lý bước kế tiếp.`,
      `/can-bo/${report.id}`
    );
    navigate('/tnv', {
      state: { toast: `Đã gửi kết quả xác minh cho ${report.id}` },
    });
  };

  const step1Done = exists !== null && (exists !== 'co' || severity !== null);
  const step2Done = photo.length > 0;
  const heroPhotos = report.photos.length > 0 ? report.photos : [];
  const safeHeroIdx = Math.min(activePhotoIndex, Math.max(0, heroPhotos.length - 1));
  const currentHeroPhoto = heroPhotos[safeHeroIdx] ?? null;

  return (
    <VolunteerLayout>
      <div className="flex min-h-screen flex-1 flex-col bg-[#F4F8FC] dark:bg-[var(--color-bg)]">
        {/* Clean Full-Width Header matching C04Confirm */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3.5 dark:border-slate-800">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Quay lại danh sách nhiệm vụ"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1
                  data-testid="screen-title"
                  className="truncate text-base sm:text-lg font-extrabold tracking-tight text-[var(--color-text)]"
                >
                  Xác minh tại chỗ
                </h1>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  <span data-testid="task-id" className="font-bold text-[#0084E8]">
                    {task.id}
                  </span>{' '}
                  · Hồ sơ {report.id}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main 12-Column Layout matching C04Confirm */}
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-6 lg:px-8 py-5 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (lg:col-span-5): Media Card + TÓM TẮT NHIỆM VỤ */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 sm:p-5 shadow-sm space-y-4 dark:border-slate-800">
              {currentHeroPhoto ? (
                <div className="space-y-2.5">
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-700">
                    <MediaItemPreview
                      src={currentHeroPhoto}
                      alt={`Ảnh hiện trường ${safeHeroIdx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                      Ảnh #{safeHeroIdx + 1}/{heroPhotos.length}
                    </span>
                  </div>
                  {heroPhotos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                      {heroPhotos.map((src, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                            idx === safeHeroIdx
                              ? 'border-[#0084E8] ring-2 ring-[#0084E8]/20'
                              : 'border-slate-200 opacity-75 hover:opacity-100 dark:border-slate-700'
                          }`}
                        >
                          <MediaItemPreview src={src} alt={`Ảnh ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Tóm tắt nhiệm vụ
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {categoryLabel}
                  </span>
                </div>

                {report.title && (
                  <div className="rounded-xl border border-slate-200/80 bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-extrabold text-[var(--color-text)] dark:border-slate-700">
                    {report.title}
                  </div>
                )}

                <div className="rounded-xl border border-slate-200/80 bg-[var(--color-surface)] p-3 flex items-start justify-between gap-2 dark:border-slate-700">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0084E8]" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Vị trí hiện trường
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)]">
                        {report.address}
                      </div>
                      {report.locationNote && (
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {report.locationNote}
                        </div>
                      )}
                    </div>
                  </div>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-extrabold text-[#0084E8] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Chỉ đường</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>

                {report.description?.trim() && (
                  <div className="rounded-xl border border-slate-200/80 bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text)] dark:border-slate-700">
                    <span className="font-bold text-slate-500">Mô tả: </span>
                    {report.description}
                  </div>
                )}

                {isInspection && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 space-y-1 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <div className="flex items-center gap-1.5 font-extrabold">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      <span>Lý do mở lại ({formatDateTime(report.createdAt)})</span>
                    </div>
                    <p>{reopenReason}</p>
                  </div>
                )}

                <div className="h-44 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <MapView
                    center={[report.lat, report.lng]}
                    zoom={16}
                    markers={[
                      {
                        id: report.id,
                        lat: report.lat,
                        lng: report.lng,
                        category: report.category,
                        status: report.status,
                        title: report.address,
                      },
                    ]}
                    selectedMarkerId={report.id}
                    autoLocateUser={true}
                    showLocateButton={true}
                    hideBuiltInLegend={true}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (lg:col-span-7): Pill Stepper + Form matching C04Confirm */}
            <div className="lg:col-span-7 lg:sticky lg:top-20">
              {isCompleted && task.result ? (
                <Card className="flex flex-col gap-4 rounded-3xl border-emerald-200 bg-[var(--color-surface)] p-6 shadow-sm dark:border-emerald-900/60">
                  <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                    <span className="text-base font-extrabold">Đã gửi kết quả xác minh</span>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-[#F8FAFC] p-4 text-sm text-[var(--color-text)] border border-slate-200 dark:bg-slate-900/60 dark:border-slate-700">
                    <p>
                      <strong>Sự cố tồn tại:</strong>{' '}
                      {EXISTS_OPTIONS.find((o) => o.value === task.result?.exists)?.label}
                    </p>
                    {task.result.severity && (
                      <p>
                        <strong>Mức độ:</strong>{' '}
                        {SEVERITY_OPTIONS.find((o) => o.value === task.result?.severity)?.label}
                      </p>
                    )}
                    {task.result.note && (
                      <p>
                        <strong>Ghi chú:</strong> {task.result.note}
                      </p>
                    )}
                  </div>
                  {task.result.photo && (
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-900">
                      <MediaItemPreview
                        src={task.result.photo}
                        alt="Ảnh xác minh tại chỗ"
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  )}
                </Card>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 sm:p-6 shadow-sm space-y-5 dark:border-slate-800"
                >
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
                    {[
                      { step: 1 as const, label: 'Thực tế', done: step1Done },
                      { step: 2 as const, label: 'Ảnh / Video', done: step2Done },
                      { step: 3 as const, label: 'Ghi chú & Gửi', done: canSubmit },
                    ].map((item) => {
                      const isCurrent = activeStep === item.step;
                      return (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() => setActiveStep(item.step)}
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition-all ${
                            isCurrent
                              ? 'bg-[#0084E8] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                              isCurrent
                                ? 'bg-white text-[#0084E8]'
                                : item.done
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {item.step}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {errorMessage && (
                    <Toast
                      type="error"
                      message={errorMessage}
                      onClose={() => setErrorMessage(null)}
                    />
                  )}

                  {activeStep === 1 && (
                    <section className="space-y-4">
                      <div>
                        <h2 className="text-base font-extrabold text-[var(--color-text)]">
                          Bước 1: Sự cố có tồn tại ngoài thực tế không?{' '}
                          <span className="text-red-600">*</span>
                        </h2>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {EXISTS_OPTIONS.map((opt) => (
                            <Chip
                              key={opt.value}
                              label={opt.label}
                              selected={exists === opt.value}
                              onClick={() => {
                                setExists(opt.value);
                                if (opt.value !== 'co') {
                                  setSeverity(null);
                                  setActiveStep(2);
                                }
                                setErrorMessage(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {exists === 'co' && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <h3 className="text-sm font-extrabold text-[var(--color-text)]">
                            Mức độ nghiêm trọng <span className="text-red-600">*</span>
                          </h3>
                          <div className="mt-2.5 flex flex-wrap gap-2.5">
                            {SEVERITY_OPTIONS.map((opt) => (
                              <Chip
                                key={opt.value}
                                label={opt.label}
                                selected={severity === opt.value}
                                onClick={() => {
                                  setSeverity(opt.value);
                                  setActiveStep(2);
                                  setErrorMessage(null);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={!step1Done}
                          onClick={() => setActiveStep(2)}
                          className="flex h-11 w-full items-center justify-center rounded-2xl bg-[#0084E8] px-5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800"
                        >
                          Tiếp tục chụp ảnh / video
                        </button>
                      </div>
                    </section>
                  )}

                  {activeStep === 2 && (
                    <section className="space-y-4">
                      <h2 className="text-base font-extrabold text-[var(--color-text)]">
                        Bước 2: Ảnh / Video tại chỗ <span className="text-red-600">*</span>
                      </h2>
                      <MediaCaptureField
                        items={mediaItems}
                        onChange={(next) => {
                          setMediaItems(next);
                        }}
                        maxItems={5}
                        allowGallery={true}
                        allowVideo={true}
                        captureLabel="Chụp ảnh / Quay video tại chỗ"
                      />
                      <div className="flex items-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Quay lại
                        </button>
                        <button
                          type="button"
                          disabled={!step2Done}
                          onClick={() => setActiveStep(3)}
                          className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-[#0084E8] px-5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800"
                        >
                          Tiếp tục ghi chú &amp; gửi
                        </button>
                      </div>
                    </section>
                  )}

                  {activeStep === 3 && (
                    <section className="space-y-4">
                      <div>
                        <label
                          htmlFor="verify-note"
                          className="mb-1.5 block text-sm font-extrabold text-[var(--color-text)]"
                        >
                          Bước 3: Ghi chú hiện trường (không bắt buộc)
                        </label>
                        <textarea
                          id="verify-note"
                          rows={3}
                          maxLength={300}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Mô tả tình trạng thực tế, phạm vi ảnh hưởng hoặc lưu ý cho đơn vị xử lý..."
                          className="w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-slate-400 focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-900/60"
                        />
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="flex h-[52px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Quay lại
                        </button>
                        <button
                          type="submit"
                          disabled={!canSubmit}
                          className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-base font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800"
                        >
                          Gửi kết quả xác minh
                        </button>
                      </div>
                    </section>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </VolunteerLayout>
  );
}
