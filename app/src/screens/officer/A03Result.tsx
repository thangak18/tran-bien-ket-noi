import { useEffect, useState, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, CheckCircle2, ImagePlus, AlertCircle } from 'lucide-react';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { useAppStore } from '@/store/AppStore';
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { isApiMode } from '@/lib/api';
import { ActionError } from '@/components/common/ActionError';
import { getCategoryConfig } from '@/domain/constants';
import { compressImage } from '@/lib/image';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { StatusChip } from '@/components/common/StatusChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '2026-11-24';
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

export function A03Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const ds = useDataSource();
  const action = useAction();
  const report = state.reports.find((r) => r.id === id);
  // Chế độ API: luôn tải chi tiết hồ sơ (danh sách không có đủ trường); local chỉ tải khi chưa có.
  const loadReport = async () => {
    if (!id) return;
    try {
      const rep = await ds.getOfficerReport(id);
      if (rep) dispatch({ type: 'ADD_REPORT', payload: { report: rep } });
    } catch {
      /* lỗi tải được báo khi gửi; hồ sơ trong danh sách vẫn hiển thị */
    }
  };
  useEffect(() => {
    if (id && (isApiMode() || !report)) void loadReport();
    // Chỉ chạy lại khi đổi hồ sơ đang xem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [afterPhotos, setAfterPhotos] = useState<string[]>(report?.resultPhotos ?? []);
  const [resultNote, setResultNote] = useState<string>(report?.resultNote ?? '');
  const [completedDate, setCompletedDate] = useState<string>(
    toDateInputValue(report?.completedAt ?? state.settings.demoNow)
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!report) {
    return (
      <OfficerLayout>
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 data-testid="screen-title" className="sr-only">
            Cập nhật kết quả
          </h1>
          <EmptyState
            icon={<AlertCircle className="h-12 w-12" />}
            title="Không tìm thấy hồ sơ"
            description={`Mã hồ sơ ${id ?? ''} không tồn tại.`}
            actionText="Quay lại hộp tiếp nhận"
            onAction={() => navigate('/can-bo')}
          />
        </div>
      </OfficerLayout>
    );
  }

  const canSubmitStatus = report.status === 'da_giao' || report.status === 'mo_lai';
  const hasEnoughPhotos = afterPhotos.length >= 1 && afterPhotos.length <= 3;
  const hasEnoughNote = resultNote.trim().length >= 10;
  const isValid = canSubmitStatus && hasEnoughPhotos && hasEnoughNote;

  const completedAtIso = `${completedDate}T09:00:00+07:00`;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setErrorMsg(null);
    const remainingSlots = 3 - afterPhotos.length;
    if (remainingSlots <= 0) {
      setErrorMsg('Tối đa 3 ảnh kết quả sau xử lý.');
      return;
    }

    const toProcess = files.slice(0, remainingSlots);
    setIsUploading(true);
    try {
      const compressed: string[] = [];
      for (const file of toProcess) {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`Ảnh "${file.name}" vượt quá 15 MB.`);
        }
        const res = await compressImage(file, 1280, 0.7);
        compressed.push(res.dataUrl);
      }
      setAfterPhotos((prev) => [...prev, ...compressed].slice(0, 3));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể xử lý ảnh đã chọn.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSamplePhoto = () => {
    if (afterPhotos.length >= 3) return;
    const samplePath = `/demo-photos/after/${report.category}.jpg`;
    if (!afterPhotos.includes(samplePath)) {
      setAfterPhotos((prev) => [...prev, samplePath].slice(0, 3));
      setErrorMsg(null);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAfterPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirm = async () => {
    if (!isValid) return;
    const updated = await action.run(
      () =>
        ds.officerCompleteReport(report.id, {
          resultPhotos: afterPhotos,
          resultNote: resultNote.trim(),
          completedAt: completedAtIso,
          version: report.version,
        }),
      { onConflict: loadReport }
    );
    if (!updated) return;
    dispatch({ type: 'ADD_REPORT', payload: { report: updated } });
    setToast({
      message: `Đã cập nhật kết quả hoàn thành cho ${report.id}`,
      type: 'success',
    });
    navigate(`/can-bo/${report.id}`);
  };

  const catConfig = getCategoryConfig(report.category);

  const disabledReasons: string[] = [];
  if (!canSubmitStatus) {
    disabledReasons.push('Hồ sơ phải ở trạng thái Đã giao xử lý hoặc Mở lại');
  }
  if (!hasEnoughPhotos) {
    disabledReasons.push('Cần ít nhất 1 ảnh sau xử lý');
  }
  if (!hasEnoughNote) {
    disabledReasons.push('Mô tả công việc phải có ít nhất 10 ký tự');
  }

  return (
    <OfficerLayout>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(`/can-bo/${report.id}`)}
            >
              Quay lại
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span
                  data-testid="report-id"
                  className="text-sm font-bold text-[var(--color-primary)]"
                >
                  {report.id}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">· {catConfig.label}</span>
                <StatusChip status={report.status} variant="officer" size="sm" />
              </div>
              <h1 data-testid="screen-title" className="text-xl font-bold text-[var(--color-text)]">
                Cập nhật kết quả
              </h1>
            </div>
          </div>
        </div>

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {!canSubmitStatus && (
          <div className="flex items-start gap-2.5 rounded-card border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              Hồ sơ đang ở trạng thái <strong>{report.status}</strong>. Chỉ có thể cập nhật kết quả
              khi hồ sơ đang ở trạng thái <strong>Đã giao xử lý</strong> hoặc{' '}
              <strong>Mở lại</strong>.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Cột trái: Form nhập kết quả (AC-A03-2) */}
          <Card className="space-y-4">
            <h2 className="text-base font-semibold text-text-main">Thông tin hoàn thành</h2>

            {/* Ảnh sau xử lý (1-3) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-main">
                  Ảnh sau xử lý ({afterPhotos.length}/3) <span className="text-red-600">*</span>
                </label>
                {afterPhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Dùng ảnh mẫu
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {afterPhotos.map((src, idx) => (
                  <div
                    key={`${src}-${idx}`}
                    className="group relative aspect-square overflow-hidden rounded-btn border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={src}
                      alt={`Ảnh sau xử lý ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label={`Xoá ảnh ${idx + 1}`}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {afterPhotos.length < 3 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-btn border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center text-xs text-text-sub hover:border-primary hover:bg-primary/5">
                    {isUploading ? (
                      <span>Đang nén...</span>
                    ) : (
                      <>
                        <ImagePlus className="mb-1 h-6 w-6 text-primary" />
                        <span>Chọn ảnh</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploading}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {errorMsg && <p className="text-xs font-medium text-red-600">{errorMsg}</p>}
            </div>

            {/* Mô tả công việc (>= 10 ký tự) */}
            <div>
              <label
                htmlFor="a03-result-note"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Mô tả công việc đã thực hiện <span className="text-red-600">*</span>
              </label>
              <textarea
                id="a03-result-note"
                rows={4}
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                placeholder="VD: Đã thay bóng đèn LED mới và kiểm tra tủ điện chiếu sáng..."
                className="w-full rounded-card border border-slate-300 p-3 text-sm text-text-main focus:border-primary focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className={hasEnoughNote ? 'text-emerald-700' : 'text-amber-700'}>
                  {hasEnoughNote
                    ? 'Đạt yêu cầu'
                    : `Cần ít nhất 10 ký tự (còn thiếu ${10 - resultNote.trim().length})`}
                </span>
                <span className="text-text-sub">{resultNote.trim().length} ký tự</span>
              </div>
            </div>

            {/* Ngày hoàn thành */}
            <div>
              <label
                htmlFor="a03-completed-date"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Ngày hoàn thành
              </label>
              <input
                id="a03-completed-date"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full rounded-btn border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-primary focus:outline-none"
              />
            </div>

            {/* Nút Xác nhận + chú thích lý do khi tắt (AC-A03-4, AC-A03-5) */}
            <div className="pt-2 space-y-2">
              <ActionError message={action.error} onDismiss={action.clearError} />
              <Button
                variant="primary"
                fullWidth
                disabled={!isValid || action.pending}
                icon={<CheckCircle2 className="h-5 w-5" />}
                onClick={() => void handleConfirm()}
              >
                Xác nhận hoàn thành
              </Button>
              {!isValid && (
                <p data-testid="submit-disabled-reason" className="text-xs text-amber-700">
                  Chưa thể xác nhận: {disabledReasons.join('; ')}.
                </p>
              )}
            </div>
          </Card>

          {/* Cột phải: Xem trước "Người dân sẽ thấy" (AC-A03-3) */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-main">Người dân sẽ thấy</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-text-sub">
                Xem trước C06
              </span>
            </div>

            <BeforeAfter
              beforePhotos={report.photos}
              afterPhotos={afterPhotos}
              beforeTime={report.createdAt}
              afterTime={afterPhotos.length > 0 ? completedAtIso : undefined}
            />

            <div className="rounded-btn border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="text-xs font-semibold text-text-sub mb-1">
                Kết quả xử lý từ {report.department || catConfig.suggestedDepartment}
              </div>
              <p className="text-text-main">
                {resultNote.trim() || 'Chưa nhập mô tả công việc đã thực hiện.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-sub">
              <Upload className="h-4 w-4 shrink-0" />
              <span>
                Khi xác nhận, hệ thống sẽ chuyển trạng thái sang <strong>Đã xử lý</strong> và gửi
                thông báo đến tất cả người theo dõi.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </OfficerLayout>
  );
}
