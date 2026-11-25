import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Wrench,
  AlertTriangle,
  ShieldCheck,
  GitMerge,
  Split,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { isApiMode } from '@/lib/api';
import type { VolunteerOption } from '@/data/DataSource';
import type { Report } from '@/domain/types';
import { ActionError } from '@/components/common/ActionError';
import { Modal } from '@/components/ui/Modal';
import { CATEGORY_CONFIGS, DEPARTMENTS, VOLUNTEERS, getCategoryConfig } from '@/domain/constants';
import { formatDateShort, formatDateTime } from '@/domain/format';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { Timeline } from '@/components/common/Timeline';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { Button } from '@/components/ui/Button';
import { findDuplicates } from '@/domain/duplicates';

export function A02Panel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const ds = useDataSource();
  const action = useAction();

  const report = state.reports.find((r) => r.id === id);

  const defaultDept = report
    ? report.department || getCategoryConfig(report.category).suggestedDepartment
    : '';

  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [officerNote, setOfficerNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modal, setModal] = useState<'tnv' | 'supplement' | 'transfer' | null>(null);
  const [reason, setReason] = useState('');
  const [agency, setAgency] = useState('');
  const [tnv, setTnv] = useState('');
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>(
    isApiMode() ? [] : VOLUNTEERS.map((name) => ({ id: name, name }))
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tải chi tiết hồ sơ. Chế độ API luôn tải lại (danh sách không có timeline); chế độ local chỉ tải khi chưa có.
  const loadReport = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rep = await ds.getOfficerReport(id);
      if (rep) {
        dispatch({ type: 'ADD_REPORT', payload: { report: rep } });
      } else {
        setLoadError(`Mã phản ánh ${id} không tồn tại.`);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };
  const fetchReport = () => void loadReport();

  useEffect(() => {
    if (id && (isApiMode() || !report)) void loadReport();
    // Chỉ chạy lại khi đổi hồ sơ đang xem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Danh sách TNV thật từ API (chế độ local dùng danh sách mẫu).
  useEffect(() => {
    if (!isApiMode()) return;
    ds.listVolunteers()
      .then(setVolunteers)
      .catch(() => setVolunteers([]));
  }, [ds]);

  // Bộ phận mặc định theo loại sự cố khi hồ sơ vừa được tải xong.
  useEffect(() => {
    if (!selectedDept && defaultDept) setSelectedDept(defaultDept);
  }, [defaultDept, selectedDept]);

  // B2 Gộp/tách hồ sơ (spec 3.5)
  const similarReports = useMemo(() => {
    if (!report) return [];
    return findDuplicates(
      { id: report.id, category: report.category, lat: report.lat, lng: report.lng },
      state.reports,
      state.settings.demoNow
    );
  }, [report, state.reports, state.settings.demoNow]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-500">Đang tải hồ sơ...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Không tìm thấy hồ sơ</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loadError || `Mã phản ánh ${id} không tồn tại.`}
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={fetchReport}>
            Thử lại
          </Button>
          <Button onClick={() => navigate('/can-bo')}>Về danh sách</Button>
        </div>
      </div>
    );
  }

  const categoryConfig =
    CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  /**
   * Chạy một thao tác nghiệp vụ qua DataSource. Thành công: cập nhật hồ sơ trong store, đóng hộp thoại, báo thành công.
   * Lỗi 401/403/409/mạng hiển thị bằng tiếng Việt; 409 tự tải lại hồ sơ (useAction).
   */
  const act = async (fn: () => Promise<Report>, msg: string): Promise<boolean> => {
    const updated = await action.run(fn, { onConflict: loadReport });
    if (!updated) return false;
    dispatch({ type: 'ADD_REPORT', payload: { report: updated } });
    setModal(null);
    setReason('');
    flash(msg);
    return true;
  };

  const version = report.version;

  const handleAccept = () =>
    act(
      () =>
        ds.officerAcceptReport(report.id, {
          department: selectedDept,
          note: officerNote || 'Cán bộ đã tiếp nhận phản ánh',
          version,
        }),
      'Đã tiếp nhận hồ sơ thành công!'
    );

  const handleAssign = () =>
    act(
      () =>
        ds.officerAssignDepartment(report.id, {
          department: selectedDept,
          note: officerNote || `Giao cho ${selectedDept}`,
          version,
        }),
      `Đã giao việc cho ${selectedDept}!`
    );

  const handleMerge = (childId: string) =>
    act(
      () => ds.officerMergeReport(childId, report.id, { version }),
      `Đã gộp phản ánh #${childId} vào hồ sơ #${report.id}!`
    );

  const handleUnmerge = (childId: string) =>
    act(
      () => ds.officerSplitReport(report.id, childId, { version }),
      `Đã tách phản ánh #${childId} ra khỏi hồ sơ #${report.id}!`
    );

  const verifyTask = state.volunteerTasks.find((t) => t.reportId === report.id && t.result);
  const canRoute = ['moi', 'da_tiep_nhan', 'cho_xac_minh'].includes(report.status);
  const reasonOk = reason.trim().length >= 10;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <h1 data-testid="screen-title" className="sr-only">
        Chi tiết & Giao xử lý
      </h1>
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

      {action.error && (
        <div className="mx-auto max-w-xl px-4 pt-3">
          <ActionError message={action.error} onDismiss={action.clearError} />
        </div>
      )}

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
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-900"
                >
                  {[...new Set([selectedDept, ...DEPARTMENTS].filter(Boolean))].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                fullWidth
                onClick={() => void handleAccept()}
                disabled={action.pending}
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
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-medium text-gray-900"
                >
                  {[...new Set([selectedDept, ...DEPARTMENTS].filter(Boolean))].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
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
                onClick={() => void handleAssign()}
                disabled={action.pending}
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

        {/* Hành động bổ sung: TNV / bổ sung / chuyển / đóng */}
        {(canRoute || report.status === 'mo_lai') && (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Thao tác khác</h3>
            {report.status === 'moi' && report.anonymous && (
              <p className="rounded-xl bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
                Hồ sơ ẩn danh: nên giao TNV xác minh trước khi xử lý.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(report.status === 'moi' || report.status === 'da_tiep_nhan') && (
                <Button variant="outline" onClick={() => setModal('tnv')}>
                  Giao TNV xác minh
                </Button>
              )}
              {canRoute && (
                <>
                  <Button variant="outline" onClick={() => setModal('supplement')}>
                    Yêu cầu bổ sung
                  </Button>
                  <Button variant="outline" onClick={() => setModal('transfer')}>
                    Chuyển cơ quan khác
                  </Button>
                </>
              )}
              {report.status === 'mo_lai' && (
                <Button
                  variant="outline"
                  disabled={action.pending}
                  onClick={() =>
                    void act(() => ds.officerCloseReport(report.id, { version }), 'Đã đóng hồ sơ')
                  }
                >
                  Đóng hồ sơ
                </Button>
              )}
              {report.status === 'cho_xac_minh' &&
                verifyTask?.result &&
                verifyTask.result.exists !== 'co' && (
                  <Button
                    variant="outline"
                    disabled={action.pending}
                    onClick={() =>
                      void act(
                        () =>
                          ds.officerMarkUnverified(report.id, {
                            reason: verifyTask.result?.note || undefined,
                            version,
                          }),
                        'Đã xác nhận không có sự cố'
                      )
                    }
                  >
                    Xác nhận không có sự cố
                  </Button>
                )}
            </div>
            {report.status === 'cho_xac_minh' && !verifyTask && (
              <p className="text-xs text-gray-500">
                Đang chờ tình nguyện viên gửi kết quả xác minh.
              </p>
            )}
          </div>
        )}

        {verifyTask?.result && (
          <div
            className="rounded-3xl border border-primary-200 bg-white p-4 shadow-2xs space-y-2"
            data-testid="verify-result"
          >
            <h3 className="text-sm font-bold text-gray-900">Kết quả xác minh</h3>
            <p className="text-xs text-gray-600">
              TNV: <b>{verifyTask.assignee}</b> · Sự cố:{' '}
              <b>
                {
                  {
                    co: 'Có tồn tại',
                    khong: 'Không tồn tại',
                    khong_tim_thay: 'Không tìm thấy vị trí',
                  }[verifyTask.result.exists]
                }
              </b>
              {verifyTask.result.severity && (
                <>
                  {' '}
                  · Mức độ:{' '}
                  <b>
                    {
                      { nhe: 'Nhẹ', trung_binh: 'Trung bình', nguy_hiem: 'Nguy hiểm' }[
                        verifyTask.result.severity
                      ]
                    }
                  </b>
                </>
              )}
            </p>
            {verifyTask.result.note && (
              <p className="text-xs italic text-gray-500">"{verifyTask.result.note}"</p>
            )}
            <img
              src={verifyTask.result.photo}
              alt="Ảnh TNV"
              className="h-40 w-full rounded-xl object-cover bg-gray-100"
            />
          </div>
        )}

        <Modal
          isOpen={modal !== null}
          onClose={() => setModal(null)}
          title={
            modal === 'tnv'
              ? 'Giao TNV xác minh'
              : modal === 'supplement'
                ? 'Yêu cầu bổ sung'
                : 'Chuyển cơ quan khác'
          }
          footer={
            modal === 'tnv' ? (
              <Button
                fullWidth
                disabled={action.pending}
                onClick={() =>
                  void act(
                    () =>
                      ds.officerAssignVolunteer(report.id, {
                        taskType: 'xac_minh',
                        assignee: volunteers.find((v) => v.id === tnv) ?? null,
                        version,
                      }),
                    'Đã giao tình nguyện viên xác minh'
                  )
                }
              >
                Xác nhận giao
              </Button>
            ) : (
              <Button
                fullWidth
                disabled={!reasonOk || (modal === 'transfer' && !agency.trim()) || action.pending}
                onClick={() =>
                  modal === 'supplement'
                    ? void act(
                        () =>
                          ds.officerRequestSupplement(report.id, {
                            reason: reason.trim(),
                            version,
                          }),
                        'Đã gửi yêu cầu bổ sung'
                      )
                    : void act(
                        () =>
                          ds.officerTransferAgency(report.id, {
                            agency: agency.trim(),
                            reason: reason.trim(),
                            version,
                          }),
                        'Đã chuyển cơ quan khác'
                      )
                }
              >
                Xác nhận
              </Button>
            )
          }
        >
          <ActionError message={action.error} onDismiss={action.clearError} className="mb-2" />
          {modal === 'tnv' ? (
            <select
              value={tnv}
              onChange={(e) => setTnv(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm"
            >
              <option value="">Để TNV gần nhất nhận</option>
              {volunteers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              {modal === 'transfer' && (
                <input
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  placeholder="Tên cơ quan tiếp nhận"
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-sm"
                />
              )}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Lý do (tối thiểu 10 ký tự)"
                className="w-full rounded-xl border border-gray-300 p-2.5 text-sm"
              />
            </div>
          )}
        </Modal>

        {/* Khối Phản ánh tương tự & Gộp hồ sơ (spec 3.5, B2) */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-primary" />
              <span>Phản ánh tương tự & Gộp hồ sơ</span>
            </h3>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Bán kính 50m
            </span>
          </div>

          {/* Các hồ sơ con đã gộp */}
          {report.mergedChildren && report.mergedChildren.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700">Hồ sơ đã gộp vào vụ này:</span>
              <div className="space-y-1.5">
                {report.mergedChildren.map((cId) => (
                  <div
                    key={cId}
                    className="flex items-center justify-between rounded-xl bg-purple-50 p-2.5 text-xs text-purple-950 border border-purple-200"
                  >
                    <span className="font-mono font-bold">#{cId}</span>
                    <button
                      type="button"
                      onClick={() => void handleUnmerge(cId)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:underline"
                    >
                      <Split className="h-3 w-3" />
                      <span>Tách hồ sơ</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Các hồ sơ nghi trùng phát hiện được */}
          {similarReports.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Phát hiện {similarReports.length} phản ánh cùng loại trong 14 ngày gần nhất:
              </p>
              <div className="space-y-2">
                {similarReports.map((sim) => (
                  <div
                    key={sim.report.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                        <img
                          src={sim.report.photos[0] || '/demo-photos/placeholder.jpg'}
                          alt="Ảnh"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect fill="%23f3f4f6" width="40" height="40"/><text fill="%239ca3af" font-size="8" dy="3" x="50%" y="50%" text-anchor="middle">Ảnh</text></svg>';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-bold text-gray-900">
                          #{sim.report.id}{' '}
                          <span className="font-normal text-gray-400">
                            · {Math.round(sim.distanceMeters)}m
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-gray-500">{sim.report.address}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleMerge(sim.report.id)}
                      className="ml-2 shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all"
                    >
                      Gộp vào hồ sơ này
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Không có phản ánh trùng nào trong phạm vi 50m.
            </p>
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
