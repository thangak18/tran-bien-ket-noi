import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Camera, Navigation } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { isApiMode } from '@/lib/api';
import { ActionError } from '@/components/common/ActionError';
import { getCategoryConfig } from '@/domain/constants';
import { Button } from '@/components/ui/Button';

type Exists = 'co' | 'khong' | 'khong_tim_thay';
type Severity = 'nhe' | 'trung_binh' | 'nguy_hiem';

const EXISTS_OPTS: { v: Exists; label: string }[] = [
  { v: 'co', label: 'Có' },
  { v: 'khong', label: 'Không' },
  { v: 'khong_tim_thay', label: 'Không tìm thấy vị trí' },
];
const SEV_OPTS: { v: Severity; label: string }[] = [
  { v: 'nhe', label: 'Nhẹ' },
  { v: 'trung_binh', label: 'Trung bình' },
  { v: 'nguy_hiem', label: 'Nguy hiểm' },
];

export function V02Verify() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const ds = useDataSource();
  const action = useAction();
  const [loading, setLoading] = useState(false);

  const [exists, setExists] = useState<Exists | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [photo, setPhoto] = useState('');
  const [note, setNote] = useState('');

  const task = state.volunteerTasks.find((t) => t.id === taskId);
  const report = task ? state.reports.find((r) => r.id === task.reportId) : undefined;

  // Chế độ API: vào thẳng đường dẫn nhiệm vụ thì tải nhiệm vụ và hồ sơ từ server.
  useEffect(() => {
    if (!isApiMode() || !taskId || (task && report)) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const t = task ?? (await ds.getVolunteerTaskById(taskId));
        if (!t || cancelled) return;
        if (!task) dispatch({ type: 'ADD_TASK', payload: t });
        if (!report) {
          const r = await ds.getReportById(t.reportId);
          if (r && !cancelled) dispatch({ type: 'ADD_REPORT', payload: { report: r } });
        }
      } catch {
        /* không tải được: hiển thị "Không tìm thấy nhiệm vụ" bên dưới */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, !!task, !!report]);

  if (loading && (!task || !report)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-500">Đang tải nhiệm vụ...</p>
      </div>
    );
  }

  if (!task || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <AlertTriangle className="mb-3 h-12 w-12 text-amber-500" />
        <h1 className="text-base font-bold text-gray-900">Không tìm thấy nhiệm vụ</h1>
        <Button className="mt-4" onClick={() => navigate('/tnv')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  const readOnly = task.status === 'xong';
  const canSubmit = !readOnly && !!exists && (exists !== 'co' || !!severity) && !!photo;

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!canSubmit || !exists) return;
    const updated = await action.run(() =>
      ds.submitVolunteerTask(task.id, {
        exists,
        severity: exists === 'co' ? (severity ?? undefined) : undefined,
        photo,
        note: note.trim() || undefined,
      })
    );
    if (!updated) return;
    navigate('/tnv', { state: { toast: 'Đã gửi kết quả cho cán bộ' } });
  };

  const big = (active: boolean) =>
    `rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors ${
      active
        ? 'border-primary bg-primary-50 text-primary-700'
        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
    }`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-4 lg:max-w-5xl">
          <button
            type="button"
            onClick={() => navigate('/tnv')}
            aria-label="Quay lại"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900" data-testid="screen-title">
            {task.type === 'xac_minh' ? 'Xác minh tại chỗ' : 'Nghiệm thu sau xử lý'}
          </h1>
          <span className="ml-auto font-mono text-xs text-gray-500">{report.id}</span>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-4 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-52 overflow-hidden rounded-xl bg-gray-100">
            <img
              src={report.photos[0]}
              alt="Ảnh người dân gửi"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
          </div>
          <p className="text-sm font-bold text-gray-900">
            {getCategoryConfig(report.category).label}
          </p>
          <p className="text-xs text-gray-600">{report.address}</p>
          {report.description && (
            <p className="text-xs italic text-gray-500">"{report.description}"</p>
          )}
          <a
            href={`https://www.openstreetmap.org/directions?to=${report.lat}%2C${report.lng}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary hover:bg-primary-50"
          >
            <Navigation className="h-4 w-4" /> Chỉ đường
          </a>
        </section>

        <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {readOnly && task.result && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Nhiệm vụ đã hoàn thành và đã gửi cho cán bộ.
            </p>
          )}
          <div>
            <h2 className="mb-2 text-sm font-bold text-gray-900">1. Sự cố có tồn tại không?</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {EXISTS_OPTS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setExists(o.v)}
                  className={big(exists === o.v)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {exists === 'co' && (
            <div>
              <h2 className="mb-2 text-sm font-bold text-gray-900">2. Mức độ</h2>
              <div className="grid grid-cols-3 gap-2">
                {SEV_OPTS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setSeverity(o.v)}
                    className={big(severity === o.v)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-bold text-gray-900">3. Ảnh tại chỗ (bắt buộc)</h2>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center text-xs text-gray-500">
              {photo ? (
                <img src={photo} alt="Ảnh tại chỗ" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera className="mb-1 h-7 w-7 text-gray-400" />
                  Chạm để chụp ảnh
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                data-testid="tnv-photo"
                disabled={readOnly}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setPhoto('/demo-photos/placeholder.jpg')}
              className="mt-1 text-xs text-gray-500 underline"
            >
              Dùng ảnh mẫu (demo)
            </button>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
              placeholder="Ghi chú (tuỳ chọn)"
              rows={2}
              className="mt-2 w-full rounded-xl border border-gray-300 p-2.5 text-sm"
            />
          </div>

          <ActionError message={action.error} onDismiss={action.clearError} />
          <Button fullWidth disabled={!canSubmit || action.pending} onClick={() => void submit()}>
            {action.pending ? 'Đang gửi...' : 'Gửi kết quả'}
          </Button>
        </section>
      </main>
    </div>
  );
}
