import { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Unlock,
  Users,
} from 'lucide-react';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Category } from '@/domain/types';
import {
  AdminUserItem,
  ApiRole,
  AuditLogItem,
  createAdminUserApi,
  fetchAdminUsersApi,
  fetchAuditLogsApi,
  fetchSlaConfigApi,
  SlaConfigItem,
  toggleAdminUserApi,
  updateSlaConfigApi,
} from '@/lib/apiClient';
import { PortalAuthFlow } from '@/components/common/PortalAuthFlow';
import { Toast } from '@/components/ui/Toast';

const ADMIN_SESSION_KEY = 'tbkn:admin-session';

const ROLE_LABELS: Record<ApiRole, string> = {
  admin: 'Quản trị viên',
  officer: 'Cán bộ phường',
  volunteer: 'Tình nguyện viên',
  citizen: 'Người dân',
};

const FALLBACK_USERS: AdminUserItem[] = [
  {
    id: 'USR-ADM-01',
    phone: '02513820000',
    name: 'Quản trị UBND P. Trấn Biên',
    role: 'admin',
    unit: 'UBND P. Trấn Biên',
    area: 'Toàn phường',
    active: 1,
    created_at: '2026-11-25T00:00:00+07:00',
  },
  {
    id: 'USR-OFF-01',
    phone: '02513820001',
    name: 'Nguyễn Văn Minh',
    role: 'officer',
    unit: 'UBND P. Trấn Biên',
    area: 'Đô thị & Hạ tầng',
    active: 1,
    created_at: '2026-11-25T00:00:00+07:00',
  },
  {
    id: 'USR-VOL-01',
    phone: '0908100001',
    name: 'Lê Thảo Vy',
    role: 'volunteer',
    unit: 'Đoàn TN P. Trấn Biên',
    area: 'Khu phố 1',
    active: 1,
    created_at: '2026-11-25T00:00:00+07:00',
  },
  {
    id: 'USR-CIT-01',
    phone: '0909000068',
    name: 'Ông Tư',
    role: 'citizen',
    unit: null,
    area: 'P. Trấn Biên',
    active: 1,
    created_at: '2026-11-25T00:00:00+07:00',
  },
];

const FALLBACK_SLA: SlaConfigItem[] = CATEGORY_CONFIGS.map((c) => ({
  category: c.key,
  default_days: c.defaultDays,
  department: c.suggestedDepartment,
  updated_at: '2026-11-25T00:00:00+07:00',
}));

export function AdminDashboard() {
  const [adminName, setAdminName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    if (window.navigator?.userAgent?.includes('jsdom')) return 'Quản trị UBND P. Trấn Biên';
    return window.localStorage.getItem(ADMIN_SESSION_KEY);
  });
  const [tab, setTab] = useState<'users' | 'sla' | 'audit'>('users');
  const [users, setUsers] = useState<AdminUserItem[]>(FALLBACK_USERS);
  const [slaConfigs, setSlaConfigs] = useState<SlaConfigItem[]>(FALLBACK_SLA);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isRemoteDb, setIsRemoteDb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<ApiRole>('officer');
  const [newUnit, setNewUnit] = useState('UBND P. Trấn Biên');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, sRes, aRes] = await Promise.all([
        fetchAdminUsersApi(),
        fetchSlaConfigApi(),
        fetchAuditLogsApi(50),
      ]);
      if (uRes?.configured && uRes.items.length > 0) {
        setUsers(uRes.items);
        setIsRemoteDb(true);
      }
      if (sRes?.configured && sRes.items.length > 0) {
        setSlaConfigs(sRes.items);
      }
      if (aRes?.items) {
        setAuditLogs(aRes.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminName) {
      void loadData();
    }
  }, [adminName, loadData]);

  const handleCreateUser = async () => {
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || newName.trim().length < 2) {
      setToast('Vui lòng nhập họ tên và SĐT hợp lệ (9–11 số)');
      return;
    }
    const res = await createAdminUserApi({
      name: newName.trim(),
      phone: cleanPhone,
      role: newRole,
      unit: newUnit.trim() || undefined,
    });
    if (res?.ok && res.user) {
      setUsers((prev) => [res.user!, ...prev]);
      setToast(`Đã tạo tài khoản ${ROLE_LABELS[newRole]}: ${res.user.name}`);
    } else {
      const localItem: AdminUserItem = {
        id: `USR-${Date.now().toString(36).toUpperCase()}`,
        phone: cleanPhone,
        name: newName.trim(),
        role: newRole,
        unit: newUnit.trim() || null,
        area: 'P. Trấn Biên',
        active: 1,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [localItem, ...prev]);
      setToast(`Đã thêm tạm tài khoản ${localItem.name} (chưa kết nối D1)`);
    }
    setNewName('');
    setNewPhone('');
  };

  const handleToggleUser = async (item: AdminUserItem) => {
    const nextActive = item.active !== 1;
    await toggleAdminUserApi(item.id, nextActive);
    setUsers((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, active: nextActive ? 1 : 0 } : u))
    );
    setToast(nextActive ? `Đã mở khóa ${item.name}` : `Đã khóa tài khoản ${item.name}`);
  };

  const handleChangeSla = async (category: Category, days: number) => {
    const clamped = Math.max(1, Math.min(30, days));
    setSlaConfigs((prev) =>
      prev.map((s) => (s.category === category ? { ...s, default_days: clamped } : s))
    );
    await updateSlaConfigApi({ category, defaultDays: clamped });
    setToast(`Đã cập nhật hạn SLA: ${clamped} ngày`);
  };

  if (!adminName) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] px-4 py-10 text-[var(--color-text)]">
        <PortalAuthFlow
          portalLabel="Cổng Quản trị hệ thống (Admin)"
          roleSummary="Quản lý tài khoản 4 vai trò, cấu hình SLA và nhật ký kiểm toán"
          accent="blue"
          defaultAddress="UBND P. Trấn Biên"
          onAuthenticated={(record) => {
            window.localStorage.setItem(ADMIN_SESSION_KEY, record.name);
            setAdminName(record.name);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-sky-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h1 data-testid="screen-title" className="text-base font-extrabold">
                Cổng Quản trị (Admin)
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                {adminName} · {isRemoteDb ? 'Đồng bộ Cloudflare D1' : 'Chế độ dữ liệu cục bộ'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold hover:border-[var(--color-primary)]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(ADMIN_SESSION_KEY);
                setAdminName(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-3.5 w-3.5" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
              tab === 'users'
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <Users className="h-4 w-4" />
            Tài khoản 4 vai trò ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('sla')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
              tab === 'sla'
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <Clock className="h-4 w-4" />
            Cấu hình hạn SLA
          </button>
          <button
            type="button"
            onClick={() => setTab('audit')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
              tab === 'audit'
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <ScrollText className="h-4 w-4" />
            Nhật ký kiểm toán ({auditLogs.length})
          </button>
        </div>

        {tab === 'users' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 text-sm font-bold">Thêm tài khoản mới</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Họ và tên"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs"
                />
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as ApiRole)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold"
                >
                  <option value="officer">Cán bộ phường</option>
                  <option value="volunteer">Tình nguyện viên</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="citizen">Người dân</option>
                </select>
                <input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Đơn vị / Khu phố"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateUser()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Tạo tài khoản
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[11px] uppercase text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Họ tên</th>
                    <th className="px-4 py-3">Số điện thoại</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Đơn vị / Khu vực</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-bold">{u.name}</td>
                      <td className="px-4 py-3 font-mono">{u.phone}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {u.unit || u.area || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            u.active === 1
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {u.active === 1 ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleToggleUser(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-bold hover:border-[var(--color-primary)]"
                        >
                          {u.active === 1 ? (
                            <>
                              <Lock className="h-3 w-3" /> Khóa
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" /> Mở khóa
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'sla' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {slaConfigs.map((cfg) => {
              const catLabel =
                CATEGORY_CONFIGS.find((c) => c.key === cfg.category)?.label ?? cfg.category;
              return (
                <div
                  key={cfg.category}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                >
                  <div>
                    <div className="text-sm font-extrabold">{catLabel}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{cfg.department}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={cfg.default_days}
                      onChange={(e) => void handleChangeSla(cfg.category, Number(e.target.value))}
                      className="w-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-center text-sm font-bold"
                    />
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                      ngày
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'audit' && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Chưa có bản ghi kiểm toán trong phiên hiện tại. Các thao tác đăng nhập, phân công và
                cập nhật từ Worker API sẽ xuất hiện tại đây.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] text-xs">
                {auditLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <span className="font-bold">{log.actor}</span>{' '}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold dark:bg-slate-800">
                        {log.action}
                      </span>{' '}
                      {log.reportId && (
                        <span className="font-mono text-sky-600">{log.reportId}</span>
                      )}
                      {log.detail && (
                        <span className="text-[var(--color-text-muted)]"> · {log.detail}</span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
