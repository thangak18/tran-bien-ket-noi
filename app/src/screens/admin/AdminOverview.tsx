import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, RefreshCw, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Toast } from '../../components/ui';
import { apiFetch, isApiMode } from '../../lib/api';
import { useAppStore } from '../../store/AppStore';
import { AdminOverviewData, getLocalAdminOverview } from '../../data/localAdminStore';

const roleLabels = {
  can_bo: 'Cán bộ',
  tnv: 'Tình nguyện viên',
  admin: 'Quản trị viên',
};

const metrics = [
  { key: 'totalReports', label: 'Tổng hồ sơ', icon: FileText, style: 'bg-blue-50 text-blue-700' },
  {
    key: 'resolvedReports',
    label: 'Đã xử lý',
    icon: CheckCircle2,
    style: 'bg-emerald-50 text-emerald-700',
  },
  {
    key: 'averageResolutionDays',
    label: 'TB ngày xử lý',
    icon: Clock3,
    style: 'bg-indigo-50 text-indigo-700',
  },
  {
    key: 'overdueReports',
    label: 'Quá hạn',
    icon: AlertTriangle,
    style: 'bg-amber-50 text-amber-800',
  },
] as const;

function ChartPanel({
  title,
  data,
  nameKey,
  color,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  nameKey: string;
  color: string;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-base font-bold text-gray-900">{title}</h2>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={nameKey}
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={58}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill={color} radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function AdminOverview() {
  const { state } = useAppStore();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!isApiMode()) {
        setData(getLocalAdminOverview(state.reports, state.settings.demoNow));
      } else {
        setData(await apiFetch<AdminOverviewData>('/admin/overview'));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không tải được thống kê quản trị. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [state.reports, state.settings.demoNow]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Quản trị</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900" data-testid="screen-title">
            Tổng quan
          </h1>
          <p className="mt-1 text-sm text-gray-500">Số liệu được tổng hợp trực tiếp từ hệ thống.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          isLoading={loading}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Làm mới
        </Button>
      </div>

      {error && (
        <Toast
          type="error"
          message={error}
          className="justify-between"
          onClose={() => setError('')}
        />
      )}

      {loading && !data ? (
        <p role="status" className="rounded-xl bg-white p-6 text-sm text-gray-600">
          Đang tải thống kê…
        </p>
      ) : (
        data && (
          <>
            <section
              aria-label="Chỉ số tổng quan"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              {metrics.map(({ key, label, icon: Icon, style }) => (
                <article
                  key={key}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{label}</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {key === 'averageResolutionDays'
                          ? data.kpi[key].toFixed(2)
                          : data.kpi[key].toLocaleString('vi-VN')}
                        {key === 'averageResolutionDays' && (
                          <span className="ml-1 text-sm font-medium text-gray-500">ngày</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${style}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <ChartPanel
                title="Phản ánh theo loại"
                data={data.byCategory.map((row) => ({ name: row.label, count: row.count }))}
                nameKey="name"
                color="#2563EB"
              />
              <ChartPanel
                title="Phản ánh theo bộ phận"
                data={data.byDepartment.map((row) => ({ name: row.name, count: row.count }))}
                nameKey="name"
                color="#0D9488"
              />
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-base font-bold text-gray-900">Tài khoản theo vai trò</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {data.accountsByRole.map((account) => (
                  <article
                    key={account.role}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{roleLabels[account.role]}</p>
                      <p className="mt-1 text-xs text-gray-500">Đang hoạt động: {account.active}</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{account.total}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
