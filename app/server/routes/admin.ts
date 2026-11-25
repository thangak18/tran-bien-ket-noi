import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, type StaffProfile } from '../middleware/auth';
import {
  createDepartment,
  createStaff,
  getAdminOverview,
  listAdminAudit,
  listCategorySettings,
  listDepartments,
  listStaff,
  patchDepartment,
  patchStaff,
  resetStaffPassword,
  setStaffActive,
  updateCategorySettings,
} from '../services/staffAdmin';
import type { AppEnv } from '../types';

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use('*', requireStaffAuth(['admin']));

const staffRole = z.enum(['can_bo', 'tnv', 'admin']);
const categories = ['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong'] as const;

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',
      422,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }
  return parsed.data;
}

const staffCreateSchema = z
  .object({
    email: z.string().trim().email('Email không hợp lệ').max(254),
    displayName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(120),
    role: staffRole,
    departmentId: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .strict();

const staffPatchSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120).optional(),
    role: staffRole.optional(),
    departmentId: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Cần có ít nhất một trường cần cập nhật');

const departmentCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    sort: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

const departmentPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    sort: z.number().int().min(0).max(10000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Cần có ít nhất một trường cần cập nhật');

const categorySettingsSchema = z
  .object({
    settings: z
      .array(
        z
          .object({
            category: z.enum(categories),
            slaDays: z.number().int().min(1).max(30),
            defaultDepartmentId: z.string().trim().min(1).max(100).nullable(),
          })
          .strict()
      )
      .length(4),
  })
  .strict()
  .refine(
    ({ settings }) => new Set(settings.map((setting) => setting.category)).size === 4,
    'Cần có đúng một cấu hình cho mỗi loại sự cố'
  );

adminRoutes.get('/staff', async (c) => {
  const querySchema = z
    .object({
      role: staffRole.optional(),
      status: z.enum(['active', 'inactive']).optional(),
      search: z.string().trim().max(120).optional(),
    })
    .strict();
  const query = parseBody(querySchema, c.req.query());
  return c.json({ items: await listStaff(query) });
});

adminRoutes.post('/staff', async (c) => {
  const input = parseBody(staffCreateSchema, await c.req.json().catch(() => null));
  const actor = c.get('staff') as StaffProfile;
  const result = await createStaff(input, actor.userId);
  return c.json(result, 201);
});

adminRoutes.patch('/staff/:id', async (c) => {
  const id = parseBody(z.string().uuid(), c.req.param('id'));
  const input = parseBody(staffPatchSchema, await c.req.json().catch(() => null));
  const actor = c.get('staff') as StaffProfile;
  return c.json({ staff: await patchStaff(id, input, actor.userId) });
});

adminRoutes.post('/staff/:id/disable', async (c) => {
  const id = parseBody(z.string().uuid(), c.req.param('id'));
  const actor = c.get('staff') as StaffProfile;
  return c.json({ staff: await setStaffActive(id, false, actor.userId) });
});

adminRoutes.post('/staff/:id/enable', async (c) => {
  const id = parseBody(z.string().uuid(), c.req.param('id'));
  const actor = c.get('staff') as StaffProfile;
  return c.json({ staff: await setStaffActive(id, true, actor.userId) });
});

adminRoutes.post('/staff/:id/reset-password', async (c) => {
  const id = parseBody(z.string().uuid(), c.req.param('id'));
  const actor = c.get('staff') as StaffProfile;
  return c.json(await resetStaffPassword(id, actor.userId));
});

adminRoutes.get('/departments', async (c) => c.json({ items: await listDepartments() }));

adminRoutes.post('/departments', async (c) => {
  const input = parseBody(departmentCreateSchema, await c.req.json().catch(() => null));
  const actor = c.get('staff') as StaffProfile;
  return c.json({ department: await createDepartment(input, actor.userId) }, 201);
});

adminRoutes.patch('/departments/:id', async (c) => {
  const id = parseBody(z.string().trim().min(1).max(100), c.req.param('id'));
  const input = parseBody(departmentPatchSchema, await c.req.json().catch(() => null));
  const actor = c.get('staff') as StaffProfile;
  return c.json({ department: await patchDepartment(id, input, actor.userId) });
});

adminRoutes.get('/category-settings', async (c) => c.json({ items: await listCategorySettings() }));

adminRoutes.patch('/category-settings', async (c) => {
  const input = parseBody(categorySettingsSchema, await c.req.json().catch(() => null));
  const actor = c.get('staff') as StaffProfile;
  return c.json({
    items: await updateCategorySettings(input.settings, actor.userId),
  });
});

adminRoutes.get('/overview', async (c) => c.json(await getAdminOverview()));

adminRoutes.get('/audit-log', async (c) => {
  const querySchema = z
    .object({
      actorId: z.string().uuid().optional(),
      action: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict();
  const query = parseBody(querySchema, c.req.query());
  return c.json(await listAdminAudit(query));
});
