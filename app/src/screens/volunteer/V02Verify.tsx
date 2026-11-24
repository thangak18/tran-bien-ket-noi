import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Camera, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { Button } from '@/components/ui/Button';

export function V02Verify() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { state } = useAppStore();

  const [done, setDone] = useState(false);

  const task = state.volunteerTasks?.find((t) => t.id === taskId);
  const report = task ? state.reports.find((r) => r.id === task.reportId) : null;

  if (!task || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h1 className="text-base font-bold text-gray-900">Không tìm thấy nhiệm vụ</h1>
        <p className="mt-1 text-xs text-gray-500">Mã nhiệm vụ {taskId} không tồn tại.</p>
        <Button className="mt-4" onClick={() => navigate('/tnv')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate('/tnv')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold text-gray-900" data-testid="screen-title">
            Xác minh tại chỗ
          </h1>
          <span className="font-mono text-xs text-gray-500" data-testid="task-id">
            {task.id}
          </span>
        </div>

        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {done && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-1" />
            <h2 className="text-sm font-bold">Đã gửi kết quả xác minh!</h2>
            <p className="text-xs text-emerald-700 mt-1">Cảm ơn bạn đã hỗ trợ cộng đồng.</p>
            <Button className="mt-3" onClick={() => navigate('/tnv')}>
              Về danh sách nhiệm vụ
            </Button>
          </div>
        )}

        {!done && (
          <>
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Hồ sơ cần kiểm tra
              </span>
              <p className="font-mono text-sm font-bold text-gray-900">{report.id}</p>
              <p className="text-xs text-gray-700 font-medium">{report.address}</p>
              {report.description && (
                <p className="text-xs text-gray-500 italic">"{report.description}"</p>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Chụp ảnh xác nhận hiện trường</h3>
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                <Camera className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Chụp 1 tấm ảnh tại vị trí sự cố để xác nhận</p>
              </div>

              <Button fullWidth onClick={() => setDone(true)}>
                Xác nhận đúng thực tế
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
