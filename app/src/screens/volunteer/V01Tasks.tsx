import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { getCategoryConfig } from '@/store/officerActions';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import type { VolunteerTask } from '@/domain/types';

export const VOLUNTEERS = ['Lê Thảo Vy', 'Trần Quốc Bảo', 'Phạm Ngọc Hân'];
export const TNV_KEY = 'tbkn:tnv';

export function getCurrentVolunteer(): string {
  try {
    return localStorage.getItem(TNV_KEY) || VOLUNTEERS[0]!;
  } catch {
    return VOLUNTEERS[0]!;
  }
}

export function V01Tasks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppStore();
  const [me, setMe] = useState(getCurrentVolunteer());
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const toast = (location.state as { toast?: string } | null)?.toast;

  const pickVolunteer = (name: string) => {
    setMe(name);
    try {
      localStorage.setItem(TNV_KEY, name);
    } catch {
      /* bỏ qua */
    }
  };

  const mine = state.volunteerTasks.filter((t) => t.assignee === me || t.assignee === null);
  const todo = mine.filter((t) => t.status !== 'xong');
  const done = mine.filter((t) => t.status === 'xong' && t.assignee === me);
  const list = tab === 'todo' ? todo : done;

  const claim = (t: VolunteerTask) => {
    dispatch({ type: 'UPDATE_TASK', payload: { ...t, assignee: me, status: 'dang_lam' } });
    navigate(`/tnv/${t.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-4 lg:max-w-5xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Về trang chủ"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900" data-testid="screen-title">
            Nhiệm vụ của tôi
          </h1>
          <span className="ml-auto hidden text-xs font-semibold text-primary lg:block">
            Cổng tình nguyện viên · Trấn Biên
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-4 lg:max-w-5xl">
        {toast && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {toast}
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn tình nguyện viên">
          {VOLUNTEERS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => pickVolunteer(v)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                me === v
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              ['todo', `Cần làm (${todo.length})`],
              ['done', `Đã xong (${done.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg py-2 text-sm font-semibold ${
                tab === k ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            Hiện chưa có nhiệm vụ
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((t) => {
              const r = state.reports.find((x) => x.id === t.reportId);
              if (!r) return null;
              const verify = t.type === 'xac_minh';
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  data-testid="task-card"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        verify ? 'bg-primary-50 text-primary-700' : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {verify ? 'Xác minh ban đầu' : 'Nghiệm thu sau xử lý'}
                    </span>
                    <span className="font-mono text-xs text-gray-500">{r.id}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <CategoryIcon category={r.category} className="h-5 w-5" />
                    {getCategoryConfig(r.category).label}
                  </div>
                  <p className="mt-1 flex items-start gap-1 text-xs text-gray-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                    {r.address}
                  </p>
                  {t.status === 'xong' ? (
                    <p className="mt-3 text-xs font-semibold text-emerald-700">
                      Đã gửi kết quả cho cán bộ
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        t.status === 'cho_nhan' ? claim(t) : navigate(`/tnv/${t.id}`)
                      }
                      className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      {t.status === 'cho_nhan' ? 'Nhận việc' : 'Làm tiếp'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
