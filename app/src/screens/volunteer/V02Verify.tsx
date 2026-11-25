import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  Trash2,
} from 'lucide-react';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { Button, Card, Chip, EmptyState, Toast } from '@/components/ui';
import { MapView } from '@/components/map/MapView';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { formatDateTime } from '@/domain/format';
import { compressImage } from '@/lib/image';
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
  const [photo, setPhoto] = useState<string>(task?.result?.photo ?? '');
  const [note, setNote] = useState<string>(task?.result?.note ?? '');
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp hình ảnh hợp lệ.');
      return;
    }

    setErrorMessage(null);
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, 1280, 0.7);
      setPhoto(compressed.dataUrl);
    } catch {
      setErrorMessage('Không thể xử lý ảnh. Vui lòng thử chụp lại.');
    } finally {
      setIsCompressing(false);
    }
  };

  const canSubmit =
    !isCompleted &&
    !isCompressing &&
    exists !== null &&
    (exists !== 'co' || severity !== null) &&
    photo.length > 0;

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
    navigate('/tnv', {
      state: { toast: `Đã gửi kết quả xác minh cho ${report.id}` },
    });
  };

  return (
    <VolunteerLayout>
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-4 p-4 md:p-6 pb-24 animate-fade-up">
        <header className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Quay lại danh sách nhiệm vụ"
            icon={<ArrowLeft className="h-5 w-5" />}
            onClick={handleBack}
          />
          <div className="min-w-0 flex-1">
            <h1
              data-testid="screen-title"
              className="truncate text-[var(--fs-title)] font-bold text-[var(--color-text)]"
            >
              Xác minh tại chỗ
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              <span data-testid="task-id">{task.id}</span> · Hồ sơ {report.id} ·{' '}
              {isInspection ? 'Nghiệm thu sau xử lý' : 'Xác minh ban đầu'}
            </p>
          </div>
        </header>

        {/* Live 3-Step Verification Progress */}
        {!isCompleted && (
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-2xs">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  exists ? 'bg-emerald-600 text-white' : 'bg-[var(--color-primary)] text-white'
                }`}
              >
                1
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-text)]">
                Kiểm tra hiện trạng
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  photo
                    ? 'bg-emerald-600 text-white'
                    : exists
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                2
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-text)]">
                Chụp ảnh tại chỗ
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  canSubmit
                    ? 'bg-emerald-600 text-white'
                    : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                3
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-text)]">
                Gửi kết quả
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* V02b · Khối nghiệm thu sau xử lý (lý do mở lại + Trước/Sau) */}
            {isInspection && (
              <Card className="flex flex-col gap-3 border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Nghiệm thu sau xử lý
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                    Lý do người dân mở lại
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-text)]">{reopenReason}</p>
                </div>
                {(report.photos.length > 0 || (report.resultPhotos?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-gray-600">Trước xử lý</p>
                      {report.photos[0] ? (
                        <img
                          src={report.photos[0]}
                          alt="Ảnh trước xử lý"
                          loading="lazy"
                          className="h-28 w-full rounded-xl border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400">
                          Không có ảnh
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-gray-600">Sau xử lý</p>
                      {report.resultPhotos?.[0] ? (
                        <img
                          src={report.resultPhotos[0]}
                          alt="Ảnh sau xử lý"
                          loading="lazy"
                          className="h-28 w-full rounded-xl border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400">
                          Chưa có ảnh sau
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {report.resultNote && (
                  <p className="text-xs text-gray-600">
                    <strong>Kết quả đơn vị báo:</strong> {report.resultNote}
                  </p>
                )}
              </Card>
            )}

            {/* Thông tin phản ánh gốc của người dân */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[var(--color-text)]">{categoryLabel}</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {formatDateTime(report.createdAt)}
                </span>
              </div>

              {report.title && (
                <div className="rounded-xl bg-[var(--color-bg)] px-3 py-2 text-sm font-extrabold text-[var(--color-text)] border border-[var(--color-border)]">
                  {report.title}
                </div>
              )}

              <div className="flex items-start gap-1.5 text-sm text-[var(--color-text)]">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">{report.address}</p>
                  {report.locationNote && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {report.locationNote}
                    </p>
                  )}
                </div>
              </div>

              {!isInspection && report.photos.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                    Ảnh gốc của người dân
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {report.photos.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`Ảnh phản ánh ${idx + 1}`}
                        loading="lazy"
                        className="h-24 w-full rounded-xl border border-[var(--color-border)] object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">Mô tả sự cố</p>
                <p className="mt-1 text-sm text-[var(--color-text)]">
                  {report.description?.trim()
                    ? report.description
                    : 'Người dân không ghi thêm mô tả.'}
                </p>
              </div>
            </Card>

            {/* Bản đồ + Chỉ đường */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--color-text)]">
                  Vị trí trên bản đồ
                </span>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-dark hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span>Chỉ đường</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
              <div className="h-48 w-full overflow-hidden rounded-xl border border-gray-200">
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
            </Card>
          </div>
          <div className="lg:col-span-5 lg:sticky lg:top-4">
            {/* Biểu mẫu xác minh 3 câu hỏi */}
            {isCompleted && task.result ? (
              <Card className="flex flex-col gap-3 border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-bold">Đã gửi kết quả xác minh</span>
                </div>
                <div className="space-y-1 text-sm text-[var(--color-text)]">
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
                  <img
                    src={task.result.photo}
                    alt="Ảnh xác minh tại chỗ"
                    loading="lazy"
                    className="h-44 w-full rounded-xl border border-gray-200 object-cover"
                  />
                )}
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {errorMessage && (
                  <Toast
                    type="error"
                    message={errorMessage}
                    onClose={() => setErrorMessage(null)}
                  />
                )}

                {/* Câu 1 */}
                <Card className="flex flex-col gap-2.5">
                  <label className="text-sm font-bold text-[var(--color-text)]">
                    1. Sự cố có tồn tại không? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXISTS_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        selected={exists === opt.value}
                        onClick={() => {
                          setExists(opt.value);
                          if (opt.value !== 'co') {
                            setSeverity(null);
                          }
                          setErrorMessage(null);
                        }}
                      />
                    ))}
                  </div>
                </Card>

                {/* Câu 2 (chỉ hiện khi Câu 1 = Có) */}
                {exists === 'co' && (
                  <Card className="flex flex-col gap-2.5">
                    <label className="text-sm font-bold text-[var(--color-text)]">
                      2. Mức độ sự cố <span className="text-red-600">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SEVERITY_OPTIONS.map((opt) => (
                        <Chip
                          key={opt.value}
                          label={opt.label}
                          selected={severity === opt.value}
                          onClick={() => {
                            setSeverity(opt.value);
                            setErrorMessage(null);
                          }}
                        />
                      ))}
                    </div>
                  </Card>
                )}

                {/* Câu 3 */}
                <Card className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[var(--color-text)]">
                    {exists === 'co' ? '3.' : '2.'} Ảnh chụp tại chỗ{' '}
                    <span className="text-red-600">*</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                    aria-label="Chọn ảnh tại chỗ"
                  />

                  {photo ? (
                    <div className="relative">
                      <img
                        src={photo}
                        alt="Ảnh chụp tại chỗ"
                        className="h-48 w-full rounded-xl border border-[var(--color-border)] object-cover"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        aria-label="Xoá ảnh tại chỗ"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setPhoto('')}
                        className="absolute right-2 top-2"
                      >
                        Xoá
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        fullWidth
                        isLoading={isCompressing}
                        icon={<Camera className="h-5 w-5" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Chụp / chọn ảnh tại chỗ
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPhoto(`/demo-photos/${report.category}/1.jpg`)}
                        className="w-full rounded-xl border border-dashed border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)]"
                      >
                        Dùng ảnh mẫu (Demo)
                      </button>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="verify-note"
                      className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]"
                    >
                      Ghi chú thêm (không bắt buộc)
                    </label>
                    <textarea
                      id="verify-note"
                      rows={3}
                      maxLength={300}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Mô tả tình trạng thực tế tại hiện trường..."
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--fs-body)] text-[var(--color-text)] shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </Card>

                <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canSubmit}>
                  Gửi kết quả xác minh
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </VolunteerLayout>
  );
}
