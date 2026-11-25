import { useCallback, useEffect, useState } from 'react';
import { Copy, Pencil, Plus, Search, UserRound } from 'lucide-react';
import { Button, BottomSheet, Modal, TextField, Toast } from '../../components/ui';
import { apiFetch, isApiMode } from '../../lib/api';
import { useAppStore } from '../../store/AppStore';
import {
  AdminAuditItem as AuditItem,
  AdminDepartmentItem as Department,
  AdminStaffItem as StaffItem,
  AdminStaffRole as StaffRole,
  createLocalDepartment,
  createLocalStaff,
  listLocalAuditLog,
  listLocalCategorySettings,
  listLocalDepartments,
  listLocalStaff,
  resetLocalStaffPassword,
  saveLocalCategorySettings,
  toggleLocalStaffActive,
  updateLocalDepartment,
  updateLocalStaff,
} from '../../data/localAdminStore';

type Notice = { message: string; type: 'success' | 'error' } | null;

const roleLabels: Record<StaffRole, string> = {
  can_bo: 'Cán bộ',
  tnv: 'Tình nguyện viên',
  admin: 'Quản trị viên',
};

function useMobileDialog() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 767px)');
    if (!query) return;
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return mobile;
}

function ResponsiveDialog({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const mobile = useMobileDialog();
  if (mobile) {
    return (
      <BottomSheet isOpen={open} title={title} onClose={onClose} footer={footer}>
        {children}
      </BottomSheet>
    );
  }
  return (
    <Modal isOpen={open} title={title} onClose={onClose} footer={footer} className="!max-w-[560px]">
      {children}
    </Modal>
  );
}

function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-primary">Quản trị</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900" data-testid="screen-title">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function AccountState({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-gray-200 bg-gray-100 text-gray-700'
      }`}
    >
      <span aria-hidden="true">{active ? '✓' : '–'}</span>
      {active ? 'Đang hoạt động' : 'Đã khoá'}
    </span>
  );
}

function ErrorOrNotice({ notice, clear }: { notice: Notice; clear: () => void }) {
  if (!notice) return null;
  return <Toast message={notice.message} type={notice.type} onClose={clear} />;
}

export function AdminStaffPage() {
  const { state } = useAppStore();
  const [items, setItems] = useState<StaffItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<StaffItem | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('tnv');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [passwordDialog, setPasswordDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isApiMode()) {
        setItems(listLocalStaff({ search, role: roleFilter, status: statusFilter }));
        setDepartments(listLocalDepartments(state.reports));
        setNotice(null);
        return;
      }
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (roleFilter) query.set('role', roleFilter);
      if (statusFilter) query.set('status', statusFilter);
      const [staffResponse, departmentResponse] = await Promise.all([
        apiFetch<{ items: StaffItem[] }>(`/admin/staff?${query.toString()}`),
        apiFetch<{ items: Department[] }>('/admin/departments'),
      ]);
      setItems(staffResponse.items);
      setDepartments(departmentResponse.items);
      setNotice(null);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không tải được danh sách tài khoản.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, state.reports, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setSelected(null);
    setDisplayName('');
    setEmail('');
    setRole('tnv');
    setDepartmentId('');
    setDialogOpen(true);
  }

  function openEdit(staff: StaffItem) {
    setSelected(staff);
    setDisplayName(staff.displayName);
    setEmail(staff.email);
    setRole(staff.role);
    setDepartmentId(staff.departmentId ?? '');
    setDialogOpen(true);
  }

  async function saveStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (!isApiMode()) {
        if (selected) {
          updateLocalStaff(selected.id, {
            displayName,
            role,
            departmentId: departmentId || null,
          });
          setNotice({ message: 'Đã cập nhật tài khoản.', type: 'success' });
          setDialogOpen(false);
        } else {
          const result = createLocalStaff({
            displayName,
            email,
            role,
            departmentId: departmentId || null,
          });
          setDialogOpen(false);
          setTemporaryPassword(result.temporaryPassword);
          setCopyMessage('');
          setPasswordDialog(true);
        }
        await load();
        return;
      }
      if (selected) {
        await apiFetch(`/admin/staff/${encodeURIComponent(selected.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            displayName,
            role,
            departmentId: departmentId || null,
          }),
        });
        setNotice({ message: 'Đã cập nhật tài khoản.', type: 'success' });
        setDialogOpen(false);
        await load();
      } else {
        const result = await apiFetch<{ temporaryPassword: string }>('/admin/staff', {
          method: 'POST',
          body: JSON.stringify({
            displayName,
            email,
            role,
            departmentId: departmentId || null,
          }),
        });
        setDialogOpen(false);
        setTemporaryPassword(result.temporaryPassword);
        setCopyMessage('');
        setPasswordDialog(true);
        await load();
      }
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không lưu được tài khoản.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(staff: StaffItem) {
    const action = staff.isActive ? 'khoá' : 'mở khoá';
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${staff.displayName}?`)) return;
    try {
      if (!isApiMode()) {
        toggleLocalStaffActive(staff.id, !staff.isActive);
      } else {
        await apiFetch(
          `/admin/staff/${encodeURIComponent(staff.id)}/${staff.isActive ? 'disable' : 'enable'}`,
          {
            method: 'POST',
          }
        );
      }
      setNotice({
        message: `Đã ${staff.isActive ? 'khoá' : 'mở khoá'} tài khoản.`,
        type: 'success',
      });
      await load();
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : 'Không cập nhật được trạng thái tài khoản.',
        type: 'error',
      });
    }
  }

  async function resetPassword(staff: StaffItem) {
    if (!window.confirm(`Cấp lại mật khẩu cho ${staff.displayName}?`)) return;
    try {
      const result = !isApiMode()
        ? resetLocalStaffPassword(staff.id)
        : await apiFetch<{ temporaryPassword: string }>(
            `/admin/staff/${encodeURIComponent(staff.id)}/reset-password`,
            { method: 'POST' }
          );
      setTemporaryPassword(result.temporaryPassword);
      setCopyMessage('');
      setPasswordDialog(true);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không cấp lại được mật khẩu.',
        type: 'error',
      });
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopyMessage('Đã sao chép mật khẩu tạm.');
    } catch {
      setCopyMessage('Không thể sao chép tự động. Hãy chọn và sao chép mật khẩu.');
    }
  }

  const formFooter = (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(false)}>
        Huỷ
      </Button>
      <Button type="submit" form="admin-staff-form" isLoading={saving}>
        {selected ? 'Lưu thay đổi' : 'Tạo tài khoản'}
      </Button>
    </>
  );
  const passwordFooter = (
    <Button
      fullWidth
      onClick={() => {
        setPasswordDialog(false);
        setTemporaryPassword('');
      }}
    >
      Đã lưu mật khẩu
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageTitle
        title="Tài khoản"
        description="Tạo, cập nhật và quản lý quyền truy cập của cán bộ, tình nguyện viên."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Tạo tài khoản
          </Button>
        }
      />
      <ErrorOrNotice notice={notice} clear={() => setNotice(null)} />

      <section className="grid gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <label className="relative block">
          <span className="sr-only">Tìm theo tên hoặc email</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên hoặc email"
            className="min-h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          <span className="sr-only">Lọc vai trò</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="">Tất cả vai trò</option>
            <option value="can_bo">Cán bộ</option>
            <option value="tnv">Tình nguyện viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          <span className="sr-only">Lọc trạng thái</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khoá</option>
          </select>
        </label>
      </section>

      {loading ? (
        <p role="status" className="rounded-xl bg-white p-6 text-sm text-gray-600">
          Đang tải tài khoản…
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Bộ phận</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{staff.displayName}</td>
                    <td className="px-4 py-3 text-gray-600">{staff.email}</td>
                    <td className="px-4 py-3">{roleLabels[staff.role]}</td>
                    <td className="px-4 py-3">{staff.departmentName || '—'}</td>
                    <td className="px-4 py-3">
                      <AccountState active={staff.isActive} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(staff.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(staff)}>
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void resetPassword(staff)}
                        >
                          Cấp lại mật khẩu
                        </Button>
                        <Button
                          variant={staff.isActive ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => void toggleActive(staff)}
                        >
                          {staff.isActive ? 'Khoá' : 'Mở khoá'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {items.map((staff) => (
              <article
                key={staff.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-gray-900">{staff.displayName}</h2>
                    <p className="mt-1 break-all text-sm text-gray-600">{staff.email}</p>
                  </div>
                  <AccountState active={staff.isActive} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-gray-500">Vai trò</dt>
                    <dd>{roleLabels[staff.role]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Bộ phận</dt>
                    <dd>{staff.departmentName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Ngày tạo</dt>
                    <dd>{new Date(staff.createdAt).toLocaleDateString('vi-VN')}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEdit(staff)}
                  >
                    Sửa
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void resetPassword(staff)}>
                    Cấp lại mật khẩu
                  </Button>
                  <Button
                    variant={staff.isActive ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => void toggleActive(staff)}
                  >
                    {staff.isActive ? 'Khoá' : 'Mở khoá'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {items.length === 0 && (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
              Không tìm thấy tài khoản phù hợp.
            </p>
          )}
        </>
      )}

      <ResponsiveDialog
        open={dialogOpen}
        title={selected ? 'Sửa tài khoản' : 'Tạo tài khoản'}
        onClose={() => setDialogOpen(false)}
        footer={formFooter}
      >
        <form
          id="admin-staff-form"
          onSubmit={(event) => void saveStaff(event)}
          className="space-y-4"
        >
          <TextField
            label="Họ và tên"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            maxLength={120}
            autoComplete="name"
          />
          <TextField
            label="Email công vụ"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required={!selected}
            disabled={Boolean(selected)}
            maxLength={254}
            autoComplete="email"
          />
          <label className="block text-sm font-medium text-gray-700">
            Vai trò
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
              className="mt-1 min-h-11 w-full rounded-2xl border border-gray-300 bg-white px-3.5"
            >
              <option value="can_bo">Cán bộ</option>
              <option value="tnv">Tình nguyện viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Bộ phận
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-2xl border border-gray-300 bg-white px-3.5"
            >
              <option value="">Chưa phân công</option>
              {departments
                .filter((department) => department.is_active)
                .map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
            </select>
          </label>
        </form>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={passwordDialog}
        title="Mật khẩu tạm"
        onClose={() => setPasswordDialog(false)}
        footer={passwordFooter}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Mật khẩu chỉ hiển thị lần này. Hãy lưu và gửi riêng cho nhân viên.
          </p>
          <div className="flex gap-2">
            <input
              aria-label="Mật khẩu tạm"
              readOnly
              value={temporaryPassword}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 font-mono text-sm"
            />
            <Button
              aria-label="Sao chép mật khẩu"
              variant="outline"
              onClick={() => void copyPassword()}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {copyMessage && (
            <p role="status" className="text-sm text-gray-600">
              {copyMessage}
            </p>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}

export function AdminDepartmentsPage() {
  const { state } = useAppStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sort, setSort] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isApiMode()) {
        setDepartments(listLocalDepartments(state.reports));
        setNotice(null);
        return;
      }
      const response = await apiFetch<{ items: Department[] }>('/admin/departments');
      setDepartments(response.items);
      setNotice(null);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không tải được bộ phận.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [state.reports]);

  useEffect(() => {
    void load();
  }, [load]);

  function openForm(department?: Department) {
    setSelected(department ?? null);
    setName(department?.name ?? '');
    setSort(String(department?.sort ?? departments.length + 1));
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (!isApiMode()) {
        if (selected) {
          updateLocalDepartment(selected.id, { name, sort: Number(sort) });
        } else {
          createLocalDepartment({ name, sort: Number(sort) });
        }
      } else if (selected) {
        await apiFetch(`/admin/departments/${encodeURIComponent(selected.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, sort: Number(sort) }),
        });
      } else {
        await apiFetch('/admin/departments', {
          method: 'POST',
          body: JSON.stringify({ name, sort: Number(sort) }),
        });
      }
      setOpen(false);
      setNotice({ message: 'Đã lưu bộ phận.', type: 'success' });
      await load();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không lưu được bộ phận.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(department: Department) {
    const action = department.is_active ? 'ngừng hoạt động' : 'kích hoạt';
    if (!window.confirm(`Bạn có chắc muốn ${action} bộ phận “${department.name}”?`)) return;
    try {
      if (!isApiMode()) {
        updateLocalDepartment(department.id, { isActive: !department.is_active });
      } else {
        await apiFetch(`/admin/departments/${encodeURIComponent(department.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !department.is_active }),
        });
      }
      setNotice({ message: `Đã ${action} bộ phận.`, type: 'success' });
      await load();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không cập nhật được bộ phận.',
        type: 'error',
      });
    }
  }

  const footer = (
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Huỷ
      </Button>
      <Button type="submit" form="department-form" isLoading={saving}>
        Lưu bộ phận
      </Button>
    </>
  );

  return (
    <div className="space-y-5">
      <PageTitle
        title="Bộ phận"
        description="Sắp xếp và quản lý các bộ phận tiếp nhận, xử lý phản ánh."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>
            Thêm bộ phận
          </Button>
        }
      />
      <ErrorOrNotice notice={notice} clear={() => setNotice(null)} />
      {loading ? (
        <p role="status" className="rounded-xl bg-white p-6 text-sm text-gray-600">
          Đang tải bộ phận…
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Tên bộ phận</th>
                  <th className="px-4 py-3">Thứ tự</th>
                  <th className="px-4 py-3">Hồ sơ tham chiếu</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.map((department) => (
                  <tr key={department.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{department.name}</td>
                    <td className="px-4 py-3">{department.sort}</td>
                    <td className="px-4 py-3">{department.report_count}</td>
                    <td className="px-4 py-3">
                      <AccountState active={department.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openForm(department)}>
                          Sửa
                        </Button>
                        <Button
                          variant={department.is_active ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => void toggleActive(department)}
                        >
                          {department.is_active ? 'Ngừng hoạt động' : 'Kích hoạt'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {departments.map((department) => (
              <article
                key={department.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-gray-900">{department.name}</h2>
                  <AccountState active={department.is_active} />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Thứ tự {department.sort} · {department.report_count} hồ sơ tham chiếu
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Bộ phận có hồ sơ tham chiếu chỉ được ngừng hoạt động, không xoá.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openForm(department)}>
                    Sửa
                  </Button>
                  <Button
                    variant={department.is_active ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => void toggleActive(department)}
                  >
                    {department.is_active ? 'Ngừng hoạt động' : 'Kích hoạt'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <ResponsiveDialog
        open={open}
        title={selected ? 'Sửa bộ phận' : 'Thêm bộ phận'}
        onClose={() => setOpen(false)}
        footer={footer}
      >
        <form id="department-form" onSubmit={(event) => void save(event)} className="space-y-4">
          <TextField
            label="Tên bộ phận"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
          <TextField
            label="Thứ tự hiển thị"
            type="number"
            min={0}
            max={10000}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            required
          />
        </form>
      </ResponsiveDialog>
    </div>
  );
}

type CategorySetting = {
  category: string;
  label: string;
  slaDays: number;
  defaultDepartmentId: string;
};

export function AdminCategorySettingsPage() {
  const { state } = useAppStore();
  const [settings, setSettings] = useState<CategorySetting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isApiMode()) {
        setSettings(
          listLocalCategorySettings().map((item) => ({
            category: item.category,
            label: item.label,
            slaDays: item.sla_days,
            defaultDepartmentId: item.default_department_id ?? '',
          }))
        );
        setDepartments(listLocalDepartments(state.reports));
        setNotice(null);
        return;
      }
      const [settingsResponse, departmentResponse] = await Promise.all([
        apiFetch<{
          items: Array<{
            category: string;
            label: string;
            sla_days: number;
            default_department_id: string | null;
          }>;
        }>('/admin/category-settings'),
        apiFetch<{ items: Department[] }>('/admin/departments'),
      ]);
      setSettings(
        settingsResponse.items.map((item) => ({
          category: item.category,
          label: item.label,
          slaDays: item.sla_days,
          defaultDepartmentId: item.default_department_id ?? '',
        }))
      );
      setDepartments(departmentResponse.items);
      setNotice(null);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không tải được cấu hình xử lý.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [state.reports]);

  useEffect(() => {
    void load();
  }, [load]);

  function update(index: number, patch: Partial<CategorySetting>) {
    setSettings((current) =>
      current.map((setting, row) => (row === index ? { ...setting, ...patch } : setting))
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      settings.some(
        (setting) =>
          !Number.isInteger(setting.slaDays) || setting.slaDays < 1 || setting.slaDays > 30
      )
    ) {
      setNotice({ message: 'Hạn xử lý phải là số nguyên từ 1 đến 30 ngày.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = settings.map((setting) => ({
        category: setting.category,
        slaDays: setting.slaDays,
        defaultDepartmentId: setting.defaultDepartmentId || null,
      }));
      if (!isApiMode()) {
        saveLocalCategorySettings(payload);
      } else {
        await apiFetch('/admin/category-settings', {
          method: 'PATCH',
          body: JSON.stringify({ settings: payload }),
        });
      }
      setNotice({
        message: 'Đã lưu cấu hình. Cấu hình mới áp dụng cho hồ sơ tiếp nhận sau đó.',
        type: 'success',
      });
      await load();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không lưu được cấu hình.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Cấu hình xử lý"
        description="Điều chỉnh SLA và bộ phận mặc định cho từng loại sự cố."
      />
      <ErrorOrNotice notice={notice} clear={() => setNotice(null)} />
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        {loading ? (
          <p role="status" className="rounded-xl bg-white p-6 text-sm text-gray-600">
            Đang tải cấu hình…
          </p>
        ) : (
          settings.map((setting, index) => (
            <section
              key={setting.category}
              className="grid gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_160px_minmax(240px,1fr)] md:items-end"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-gray-900">{setting.label}</h2>
                  <p className="text-xs text-gray-500">{setting.category}</p>
                </div>
              </div>
              <TextField
                label="Hạn xử lý (ngày)"
                type="number"
                min={1}
                max={30}
                value={setting.slaDays}
                onChange={(event) => update(index, { slaDays: Number(event.target.value) })}
                required
              />
              <label className="block text-sm font-medium text-gray-700">
                Bộ phận mặc định
                <select
                  value={setting.defaultDepartmentId}
                  onChange={(event) => update(index, { defaultDepartmentId: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-2xl border border-gray-300 bg-white px-3.5"
                >
                  <option value="">Chưa chọn</option>
                  {departments
                    .filter((department) => department.is_active)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </label>
            </section>
          ))
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          <p>Thay đổi chỉ áp dụng cho hồ sơ được tiếp nhận sau khi lưu.</p>
          <Button type="submit" isLoading={saving} disabled={loading}>
            Lưu cấu hình
          </Button>
        </div>
      </form>
    </div>
  );
}

const actionLabels: Record<string, string> = {
  'staff.create': 'Tạo tài khoản',
  'staff.update': 'Sửa tài khoản',
  'staff.disable': 'Khoá tài khoản',
  'staff.enable': 'Mở khoá tài khoản',
  'staff.reset_password': 'Cấp lại mật khẩu',
  'department.create': 'Thêm bộ phận',
  'department.update': 'Sửa bộ phận',
  'category_setting.update': 'Đổi cấu hình SLA',
};

export function AdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isApiMode()) {
        const auditResponse = listLocalAuditLog({ actorId, action, page, pageSize });
        setItems(auditResponse.items);
        setTotal(auditResponse.total);
        setStaff(listLocalStaff());
        setNotice(null);
        return;
      }
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (actorId) query.set('actorId', actorId);
      if (action.trim()) query.set('action', action.trim());
      const [auditResponse, staffResponse] = await Promise.all([
        apiFetch<{ items: AuditItem[]; total: number }>(`/admin/audit-log?${query.toString()}`),
        apiFetch<{ items: StaffItem[] }>('/admin/staff'),
      ]);
      setItems(auditResponse.items);
      setTotal(auditResponse.total);
      setStaff(staffResponse.items);
      setNotice(null);
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'Không tải được nhật ký.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [action, actorId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Nhật ký quản trị"
        description="Theo dõi các thay đổi tài khoản, bộ phận và cấu hình."
      />
      <ErrorOrNotice notice={notice} clear={() => setNotice(null)} />
      <section className="grid gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Người thực hiện
          <select
            value={actorId}
            onChange={(event) => {
              setActorId(event.target.value);
              setPage(1);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
          >
            <option value="">Tất cả người dùng</option>
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Hành động"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          placeholder="Ví dụ: staff.update"
        />
      </section>
      {loading ? (
        <p role="status" className="rounded-xl bg-white p-6 text-sm text-gray-600">
          Đang tải nhật ký…
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Thời điểm</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Thao tác</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(item.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{item.actor_name}</span>
                      <span className="block text-xs text-gray-500">{item.actor_email}</span>
                    </td>
                    <td className="px-4 py-3">{actionLabels[item.action] ?? item.action}</td>
                    <td className="px-4 py-3">
                      {item.target_type} · {item.target_id}
                    </td>
                    <td className="max-w-72 truncate px-4 py-3 text-xs text-gray-600">
                      {JSON.stringify(item.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString('vi-VN')}
                </p>
                <h2 className="mt-1 font-bold text-gray-900">
                  {actionLabels[item.action] ?? item.action}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {item.actor_name} · {item.actor_email}
                </p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {item.target_type} · {item.target_id}
                </p>
                <p className="mt-2 break-all rounded bg-gray-50 p-2 text-xs text-gray-600">
                  {JSON.stringify(item.detail)}
                </p>
              </article>
            ))}
          </div>
          {items.length === 0 && (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
              Chưa có thao tác quản trị phù hợp.
            </p>
          )}
          <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
            <p className="text-sm text-gray-600">
              Trang {page} / {pageCount} · {total} thao tác
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
