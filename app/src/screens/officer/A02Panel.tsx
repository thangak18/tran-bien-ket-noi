import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send, Wrench, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { acceptReport, assignDepartment, getCategoryConfig } from '@/store/officerActions';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { formatDateShort, formatDateTime } from '@/domain/format';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { Timeline } from '@/components/common/Timeline';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { Button } from '@/components/ui/Button';

export function A02Panel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const report = state.reports.find((r) => r.id === id);

  const defaultDept = report
    ? report.department || getCategoryConfig(report.category).suggestedDepartment
    : '';

  const [selectedDept, setSelectedDept] = useState(defaultDept);
  const [officerNote, setOfficerNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Không tìm thấy hồ sơ</h1>
        <p className="mt-1 text-sm text-gray-500">Mã phản ánh {id} không tồn tại.</p>
        <Button className="mt-4" onClick={() => navigate('/can-bo')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  const categoryConfig =
    CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;

  const handleAccept = () => {
    try {
      const newState = acceptReport(
        state,
        report.id,
        {
          department: selectedDept,
          note: officerNote || 'Cán bộ đã tiếp nhận phản ánh',
        },
        state.settings.demoNow
      );
      dispatch({ type: 'HYDRATE', payload: newState });
      setSuccessMsg('Đã tiếp nhận hồ sơ thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = () => {
    try {
      const newState = assignDepartment(
        state,
        report.id,
        {
          department: selectedDept,
          note: officerNote || `Giao cho ${selectedDept}`,
        },
        state.settings.demoNow
      );
      dispatch({ type: 'HYDRATE', payload: newState });
      setSuccessMsg(`Đã giao việc cho ${selectedDept}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate('/can-bo')}
          aria-label="Quay lại"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <span className="font-mono text-base font-bold text-gray-900" data-testid="report-id">
            {report.id}
          </span>
          <span className="ml-2 text-xs text-gray-500">Chi tiết xử lý</span>
        </div>

        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-xl px-4 py-4 space-y-4">
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Ảnh sự cố */}
        <div className="relative h-60 w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-2xs">
          <img
            src={report.photos[0] || '/demo-photos/mat_duong/1.jpg'}
            alt="Hiện trường"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect fill="%23f3f4f6" width="400" height="240"/><text fill="%239ca3af" font-family="sans-serif" font-size="14" dy="5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh hiện trường</text></svg>';
            }}
          />
        </div>

        {/* Thông tin sự cố */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <CategoryIcon category={report.category} className="h-5 w-5" />
              <span className="text-sm font-bold text-gray-900">{categoryConfig.label}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <StatusChip status={report.status} variant="officer" size="sm" />
              <DelayChip report={report} now={state.settings.demoNow} />
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-gray-600">
            <div>
              <span className="font-semibold text-gray-800">Địa chỉ: </span>
              <span>{report.address}</span>
            </div>
            {report.description && (
              <div>
                <span className="font-semibold text-gray-800">Mô tả: </span>
                <span className="italic">{report.description}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-800">Thời điểm gửi: </span>
              <span>{formatDateTime(report.createdAt)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-800">Người gửi: </span>
              <span>{report.anonymous ? 'Ẩn danh' : report.reporterPhone || 'Công dân'}</span>
            </div>
          </div>
        </div>

        {/* Khung hành động của Cán bộ */}
        <div className="rounded-3xl border border-primary-200 bg-primary-50/40 p-4 shadow-2xs space-y-3.5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Thao tác nghiệp vụ</span>
          </h3>

          {/* Nếu MOI: Tiếp nhận */}
          {report.status === 'moi' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Hồ sơ mới gửi. Cán bộ xem xét và bấm "Tiếp nhận" để chính thức đưa vào quy trình.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bộ phận dự kiến tiếp quản:
                </label>
                <input
                  type="text"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-900"
                />
              </div>

              <Button
                fullWidth
                onClick={handleAccept}
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Tiếp nhận phản ánh</span>
              </Button>
            </div>
          )}

          {/* Nếu DA_TIEP_NHAN: Giao xử lý */}
          {report.status === 'da_tiep_nhan' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Hồ sơ đã tiếp nhận. Chọn bộ phận phụ trách để chuyển giao xử lý hiện trường:
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Đơn vị / Bộ phận tiếp nhận:
                </label>
                <input
                  type="text"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ghi chú chỉ đạo (nếu có):
                </label>
                <input
                  type="text"
                  value={officerNote}
                  onChange={(e) => setOfficerNote(e.target.value)}
                  placeholder="Ví dụ: Kiểm tra ngay trong ngày mai..."
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900"
                />
              </div>

              <Button
                fullWidth
                onClick={handleAssign}
                className="flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>Giao xử lý</span>
              </Button>
            </div>
          )}

          {/* Nếu DA_GIAO hoặc MO_LAI: Cập nhật kết quả */}
          {(report.status === 'da_giao' || report.status === 'mo_lai') && (
            <div className="space-y-3">
              <div className="rounded-xl bg-white p-3 border border-gray-200 text-xs text-gray-700 space-y-1">
                <div>
                  <span className="font-semibold">Bộ phận đang xử lý: </span>
                  <span className="font-bold text-primary">{report.department}</span>
                </div>
                {report.dueAt && (
                  <div>
                    <span className="font-semibold">Hạn xử lý: </span>
                    <span>{formatDateShort(report.dueAt)}</span>
                  </div>
                )}
              </div>

              <Button
                fullWidth
                variant="primary"
                onClick={() => navigate(`/can-bo/${report.id}/ket-qua`)}
                className="flex items-center justify-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                <span>Cập nhật kết quả hoàn thành</span>
              </Button>
            </div>
          )}

          {/* Nếu HOAN_THANH hoặc DONG */}
          {(report.status === 'hoan_thanh' || report.status === 'dong') && (
            <div className="rounded-xl bg-white p-3 border border-emerald-200 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Hồ sơ đã được xử lý hoàn tất</span>
              </div>
              {report.resultNote && <p className="text-gray-700 italic">"{report.resultNote}"</p>}
            </div>
          )}
        </div>

        {/* Khối Trước/Sau nếu có ảnh kết quả */}
        {report.resultPhotos && report.resultPhotos.length > 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Hình ảnh kết quả xử lý</h3>
            <BeforeAfter
              beforePhotos={report.photos}
              afterPhotos={report.resultPhotos}
              beforeTime={report.createdAt}
              afterTime={report.completedAt}
              category={report.category}
            />
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Nhật ký xử lý hồ sơ</h3>
          <Timeline report={report} now={state.settings.demoNow} />
        </div>
      </main>
    </div>
  );
}
