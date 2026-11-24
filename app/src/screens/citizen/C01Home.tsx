import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, ChevronRight, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { NotificationBell } from '@/components/citizen/NotificationBell';
import { ProgressBar } from '@/components/common/ProgressBar';
import { DelayChip } from '@/components/common/DelayChip';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { CATEGORY_CONFIGS, publicLabel } from '@/domain/constants';
import { WARD_CENTER } from '@/data/streets';
import { haversineMeters } from '@/domain/geo';
import { formatDistance } from '@/domain/format';
import { formatLatestUpdate, computeDelayDays } from '@/domain/latestUpdate';
import { computeKpi } from '@/domain/kpi';

export function C01Home() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { reports, settings, notifications } = state;
  const now = settings.demoNow;

  // Lọc các hồ sơ mà máy này sở hữu (qua deviceReports hoặc SĐT đã xác thực)
  const myReports = useMemo(() => {
    const deviceIds = new Set(settings.deviceReports.map((d) => d.id));
    const userPhone = settings.phone;
    return reports
      .filter((r) => deviceIds.has(r.id) || (userPhone && r.followers.includes(userPhone)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, settings.deviceReports, settings.phone]);

  // Lấy 3 phản ánh gần nhất quanh đây (loại trừ da_gop)
  const nearbyReports = useMemo(() => {
    const center = WARD_CENTER; // Tọa độ mặc định tâm phường
    return reports
      .filter((r) => r.status !== 'da_gop')
      .map((r) => ({
        report: r,
        distance: haversineMeters(center.lat, center.lng, r.lat, r.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [reports]);

  // Tính số liệu KPI tháng 11
  const kpi = useMemo(() => computeKpi(reports, '2026-11', now), [reports, now]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      {/* Header bí mật cho router test */}
      <h1 data-testid="screen-title" className="sr-only">
        Trang chủ
      </h1>

      {/* Header đỉnh: Tên phường + Chuông thông báo */}
      <header className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Đô thị thông minh
          </span>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Phường Trấn Biên</h2>
        </div>
        <NotificationBell notifications={notifications} />
      </header>

      {/* Thẻ kêu gọi hành động (Hero card nền primary) */}
      <section className="relative overflow-hidden rounded-3xl bg-primary p-5 text-white shadow-md">
        <div className="relative z-10 space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-bold leading-snug">Thấy chỗ hư hỏng?</h3>
            <p className="text-sm text-teal-100">Chụp một tấm, phường sẽ lo.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/bao-su-co/anh')}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-sm transition-transform active:scale-95"
          >
            <Camera className="h-5 w-5" />
            <span>Báo sự cố</span>
          </button>
        </div>
        {/* Hình khối trang trí */}
        <div className="absolute -right-6 -bottom-8 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
      </section>

      {/* Khối Phản ánh của bạn (chỉ hiện khi có hồ sơ của máy này) */}
      {myReports.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Phản ánh của bạn
            </h3>
            {myReports.length > 1 && (
              <span className="text-xs text-slate-500 font-medium">{myReports.length} hồ sơ</span>
            )}
          </div>

          <div className="flex overflow-x-auto gap-3 pb-2 pt-0.5 snap-x scrollbar-none">
            {myReports.map((r) => {
              const catCfg = CATEGORY_CONFIGS.find((c) => c.key === r.category);
              const delayDays = computeDelayDays(r, now);
              const updateText = formatLatestUpdate(r, now);

              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/phan-anh/${r.id}`)}
                  className="min-w-[280px] max-w-[320px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={r.category} className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold text-slate-900">
                        {catCfg?.label} · {r.id}
                      </span>
                    </div>
                    {delayDays > 0 && <DelayChip delayDays={delayDays} />}
                  </div>

                  <ProgressBar report={r} />

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {updateText}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Khối Quanh đây */}
      <section data-testid="c01-nearby-section" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quanh đây</h3>
          <Link
            to="/quanh-day"
            className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Xem bản đồ</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
          {nearbyReports.map(({ report: r, distance }) => {
            const catCfg = CATEGORY_CONFIGS.find((c) => c.key === r.category);
            return (
              <div
                key={r.id}
                data-testid="nearby-item"
                onClick={() => navigate(`/phan-anh/${r.id}`)}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                    <CategoryIcon category={r.category} className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {catCfg?.label} · {publicLabel(r.status)}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1">{r.address}</div>
                  </div>
                </div>

                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {formatDistance(distance)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dải số liệu dẫn tới /minh-bach */}
      <section>
        <Link
          to="/minh-bach"
          data-testid="c01-kpi-strip"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-slate-300"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              Tháng 11: {kpi.resolved}/{kpi.total} phản ánh đã xử lý
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>
    </div>
  );
}
