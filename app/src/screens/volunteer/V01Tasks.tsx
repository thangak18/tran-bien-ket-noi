import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';

export function V01Tasks() {
  const navigate = useNavigate();
  const { state } = useAppStore();

  const tasks = state.volunteerTasks || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-sm font-bold text-gray-900" data-testid="screen-title">
          Nhiệm vụ tình nguyện viên
        </h1>

        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        <div className="rounded-3xl bg-linear-to-r from-emerald-700 to-teal-800 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <Users className="h-4 w-4" />
            <span>Đồng hành cùng Trấn Biên</span>
          </div>
          <h2 className="mt-1 text-base font-bold">Xác minh & Nghiệm thu hiện trường</h2>
          <p className="mt-1 text-xs text-emerald-100/90 leading-relaxed">
            Hỗ trợ phường xác minh nhanh các điểm sự cố và ghi nhận kết quả xử lý.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-gray-500">
            Danh sách nhiệm vụ ({tasks.length})
          </h3>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-500">
              Hiện tại không có nhiệm vụ nào cần xác minh.
            </div>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tnv/${t.id}`)}
                className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900">{t.id}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {t.type === 'xac_minh' ? 'Xác minh sự cố' : 'Nghiệm thu kết quả'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Hồ sơ: <span className="font-mono font-medium text-gray-700">{t.reportId}</span>
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>
                      {t.status === 'cho_nhan'
                        ? 'Chờ nhận'
                        : t.status === 'dang_lam'
                          ? 'Đang làm'
                          : 'Hoàn thành'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <span>Thực hiện</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
