import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  primaryKey,
  index,
  customType,
  foreignKey,
} from 'drizzle-orm/pg-core';

// Custom PostGIS Geography Point type (hỗ trợ PostGIS gốc hoặc fallback PostgreSQL cube/earthdistance)
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography';
  },
});

// 11.1 Enums
export const categoryEnum = pgEnum('category', ['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong']);

export const reportStatusEnum = pgEnum('report_status', [
  'moi',
  'da_tiep_nhan',
  'cho_xac_minh',
  'da_giao',
  'hoan_thanh',
  'dong',
  'mo_lai',
  'can_bo_sung',
  'da_gop',
  'chuyen_co_quan_khac',
  'khong_xac_nhan',
]);

export const priorityEnum = pgEnum('priority', ['cao', 'binh_thuong']);

export const taskTypeEnum = pgEnum('task_type', ['xac_minh', 'nghiem_thu']);

export const taskStatusEnum = pgEnum('task_status', ['cho_nhan', 'dang_lam', 'xong']);

export const staffRoleEnum = pgEnum('staff_role', ['can_bo', 'tnv', 'admin']);

export const followerSourceEnum = pgEnum('follower_source', [
  'reporter',
  'also_me',
  'subscribe_later',
]);

export const photoKindEnum = pgEnum('photo_kind', ['before', 'after', 'verify', 'feedback']);

export const actorTypeEnum = pgEnum('actor_type', ['citizen', 'staff', 'system']);

// 11.2 Tables
export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

export const categorySettings = pgTable('category_settings', {
  category: categoryEnum('category').primaryKey(),
  label: text('label').notNull(),
  defaultDepartmentId: text('default_department_id').references(() => departments.id),
  slaDays: integer('sla_days').notNull(),
});

export const staffProfiles = pgTable('staff_profiles', {
  userId: uuid('user_id').primaryKey(),
  email: text('email'),
  role: staffRoleEnum('role').notNull(),
  displayName: text('display_name').notNull(),
  departmentId: text('department_id').references(() => departments.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    category: categoryEnum('category').notNull(),
    status: reportStatusEnum('status').notNull().default('moi'),
    statusBeforeMerge: reportStatusEnum('status_before_merge'),
    priority: priorityEnum('priority').notNull().default('binh_thuong'),
    location: geographyPoint('location').notNull(),
    address: text('address').notNull(),
    locationNote: text('location_note'),
    description: text('description'),
    departmentId: text('department_id').references(() => departments.id),
    dueAt: timestamp('due_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    reporterPhone: text('reporter_phone'),
    anonymous: boolean('anonymous').notNull().default(false),
    subscribedLater: boolean('subscribed_later').notNull().default(false),
    onBehalf: boolean('on_behalf').notNull().default(false),
    secretCodeHash: text('secret_code_hash').notNull(),
    ownerTokenHash: text('owner_token_hash'),
    anonymousFollows: integer('anonymous_follows').notNull().default(0),
    mergedInto: uuid('merged_into'),
    photosApproved: boolean('photos_approved').notNull().default(false),
    resultNote: text('result_note'),
    version: integer('version').notNull().default(1),
    isSeed: boolean('is_seed').notNull().default(false),
  },
  (table) => [
    index('reports_status_due_idx').on(table.status, table.dueAt),
    index('reports_category_created_idx').on(table.category, table.createdAt),
    index('reports_phone_idx').on(table.reporterPhone),
    foreignKey({
      columns: [table.mergedInto],
      foreignColumns: [table.id],
      name: 'reports_merged_into_fkey',
    }),
  ]
);

export const reportPhotos = pgTable(
  'report_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    kind: photoKindEnum('kind').notNull(),
    storagePath: text('storage_path').notNull(),
    sort: integer('sort').notNull().default(0),
    source: text('source').notNull().default('storage'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('report_photos_report_id_idx').on(table.reportId)]
);

export const reportFollowers = pgTable(
  'report_followers',
  {
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    source: followerSourceEnum('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.reportId, table.phone] }),
    index('report_followers_phone_idx').on(table.phone),
  ]
);

export const reportTimeline = pgTable(
  'report_timeline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    status: reportStatusEnum('status').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorStaffId: uuid('actor_staff_id').references(() => staffProfiles.userId),
    actorLabel: text('actor_label').notNull(),
    note: text('note'),
  },
  (table) => [index('report_timeline_report_id_idx').on(table.reportId, table.at)]
);

export const reportDuplicateFlags = pgTable(
  'report_duplicate_flags',
  {
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    otherReportId: uuid('other_report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.reportId, table.otherReportId] })]
);

export const feedback = pgTable('feedback', {
  reportId: uuid('report_id')
    .primaryKey()
    .references(() => reports.id, { onDelete: 'cascade' }),
  resolved: boolean('resolved').notNull(),
  rating: integer('rating'),
  tags: jsonb('tags').$type<string[]>(),
  comment: text('comment'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});

export const volunteerTasks = pgTable(
  'volunteer_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    type: taskTypeEnum('type').notNull(),
    status: taskStatusEnum('status').notNull().default('cho_nhan'),
    assigneeId: uuid('assignee_id').references(() => staffProfiles.userId),
    resultExists: text('result_exists'),
    resultSeverity: text('result_severity'),
    resultNote: text('result_note'),
    resultAt: timestamp('result_at', { withTimezone: true }),
  },
  (table) => [
    index('volunteer_tasks_report_id_idx').on(table.reportId),
    index('volunteer_tasks_assignee_idx').on(table.assigneeId, table.status),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
    message: text('message').notNull(),
    channel: text('channel').notNull().default('sms_mo_phong'),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notifications_phone_created_idx').on(table.phone, table.createdAt)]
);

export const phoneOtps = pgTable('phone_otps', {
  phone: text('phone').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
});

export const anonymousSubmissions = pgTable(
  'anonymous_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull(),
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('anon_sub_device_idx').on(table.deviceId, table.createdAt),
    index('anon_sub_ip_idx').on(table.ipHash, table.createdAt),
  ]
);

export const accessAttempts = pgTable(
  'access_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: text('report_id').notNull(),
    ipHash: text('ip_hash').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('access_attempts_lookup_idx').on(table.reportId, table.ipHash, table.at)]
);

export const pendingUploads = pgTable('pending_uploads', {
  path: text('path').primaryKey(),
  deviceId: text('device_id'),
  staffId: uuid('staff_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  attached: boolean('attached').notNull().default(false),
});

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorStaffId: uuid('actor_staff_id')
      .notNull()
      .references(() => staffProfiles.userId, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    detail: jsonb('detail').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_audit_log_actor_created_idx').on(table.actorStaffId, table.createdAt),
    index('admin_audit_log_action_created_idx').on(table.action, table.createdAt),
  ]
);
