import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { useAppStore } from '@/store/AppStore';
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { isApiMode } from '@/lib/api';
import { ActionError } from '@/components/common/ActionError';
import { getCategoryConfig } from '@/domain/constants';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { MediaCaptureField } from '@/components/common/MediaCapture';
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

            {/* Ảnh / Video sau xử lý (1-5) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-main">
                Ảnh / Video sau xử lý ({afterPhotos.length}/5){' '}
                <span className="text-red-600">*</span>
              </label>
              <MediaCaptureField
                items={afterPhotos}
                onChange={setAfterPhotos}
                maxItems={5}
                allowGallery={true}
                allowVideo={true}
                captureLabel="Chụp ảnh / Quay video tại chỗ"
              />
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
