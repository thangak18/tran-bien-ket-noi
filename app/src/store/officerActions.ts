import { AppState } from './AppStore';
import { Category, Notification, Report, VolunteerTask } from '../domain/types';
import { CATEGORY_CONFIGS, DEFAULT_DEADLINES } from '../domain/constants';
import { computePriority } from '../domain/sorting';
import { buildNotification } from '../domain/notifications';
import { formatDate } from '../domain/format';

/**
 * Tìm cấu hình danh mục sự cố
 */
export function getCategoryConfig(category: Category) {
  const cfg = CATEGORY_CONFIGS.find((c) => c.key === category);
  if (!cfg) {
    throw new Error(`Không tìm thấy cấu hình cho loại sự cố: ${category}`);
  }
  return cfg;
}

/**
 * Tạo ID tiếp theo cho VolunteerTask (dạng NV-001, NV-002, ...)
 */
function getNextTaskId(tasks: VolunteerTask[]): string {
  let maxNum = 0;
  for (const t of tasks) {
    const match = t.id.match(/^NV-(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `NV-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * 1. Tiếp nhận hồ sơ (spec 3.3, AC-A02-3)
 * Mặc định: department và dueAt tính theo SLA của loại sự cố.
 */
export function acceptReport(
  state: AppState,
  reportId: string,
  params:
    | {
        department?: string;
        dueAt?: string;
        category?: Category;
        note?: string;
        actor?: string;
      }
    | undefined,
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  const category = params?.category || report.category;
  const cfg = getCategoryConfig(category);
  const department = params?.department || cfg.suggestedDepartment;

  const slaDays = DEFAULT_DEADLINES[category] || cfg.defaultDays;
  const dueAt =
    params?.dueAt ||
    new Date(new Date(report.createdAt).getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();

  const newTimeline = [
    ...report.timeline,
    {
      at: now,
      status: 'da_tiep_nhan' as const,
      actor: params?.actor || 'Cán bộ tiếp nhận',
      note: params?.note || 'Đã tiếp nhận hồ sơ',
    },
  ];

  const updatedReport: Report = {
    ...report,
    category,
    department,
    dueAt,
    status: 'da_tiep_nhan',
    timeline: newTimeline,
  };

  // Tạo thông báo cho các follower
  const newNotifications: Notification[] = [];
  let notifCounter = state.notifications.length;
  for (const phone of updatedReport.followers) {
    notifCounter += 1;
    newNotifications.push({
      id: `TB-NOTIF-${notifCounter}`,
      phone,
      reportId: report.id,
      message: buildNotification('da_tiep_nhan', {
        id: report.id,
        date: formatDate(dueAt),
      }),
      createdAt: now,
      read: false,
      channel: 'sms_mo_phong',
    });
  }

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
    notifications: [...newNotifications, ...state.notifications],
  };
}

/**
 * 2. Giao TNV xác minh (spec 3.3, AC-A02-4)
 */
export function assignVolunteer(
  state: AppState,
  reportId: string,
  params: {
    assignee?: string | null;
    note?: string;
    actor?: string;
  },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  const taskId = getNextTaskId(state.volunteerTasks);
  const newTask: VolunteerTask = {
    id: taskId,
    reportId,
    type: 'xac_minh',
    assignee: params.assignee ?? null,
    status: params.assignee ? 'dang_lam' : 'cho_nhan',
  };

  const newTimeline = [
    ...report.timeline,
    {
      at: now,
      status: 'cho_xac_minh' as const,
      actor: params.actor || 'Cán bộ tiếp nhận',
      note:
        params.note ||
        (params.assignee ? `Giao TNV ${params.assignee} xác minh` : 'Chờ TNV nhận xác minh'),
    },
  ];

  const updatedReport: Report = {
    ...report,
    status: 'cho_xac_minh',
    timeline: newTimeline,
  };

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
    volunteerTasks: [newTask, ...state.volunteerTasks],
  };
}

/**
 * 3. Gửi kết quả xác minh từ TNV (spec 3.3, AC-V02)
 */
export function submitVerification(
  state: AppState,
  taskId: string,
  result: {
    exists: 'co' | 'khong' | 'khong_tim_thay';
    severity?: 'nhe' | 'trung_binh' | 'nguy_hiem';
    photo: string;
    note?: string;
  },
  now: string
): AppState {
  const task = state.volunteerTasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Không tìm thấy nhiệm vụ ${taskId}`);
  }

  const report = state.reports.find((r) => r.id === task.reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${task.reportId}`);
  }

  const updatedTask: VolunteerTask = {
    ...task,
    status: 'xong',
    result: {
      ...result,
      at: now,
    },
  };

  let nextStatus = report.status;
  let timelineNote = '';

  if (result.exists === 'co') {
    if (task.type === 'xac_minh') {
      nextStatus = 'da_tiep_nhan';
      timelineNote = `TNV xác minh: Có sự cố${result.severity ? ` (mức độ: ${result.severity})` : ''}`;
    } else {
      timelineNote = 'TNV nghiệm thu: Sự cố đã được xử lý đạt yêu cầu';
    }
  } else {
    // Không có hoặc không tìm thấy: giữ nguyên trạng thái cho_xac_minh chờ CB xác nhận
    timelineNote = `TNV xác minh: ${result.exists === 'khong' ? 'Không có sự cố' : 'Không tìm thấy vị trí'}`;
  }

  const updatedReport: Report = {
    ...report,
    status: nextStatus,
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: nextStatus,
        actor: task.assignee || 'Tình nguyện viên',
        note: timelineNote,
      },
    ],
  };

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === report.id ? updatedReport : r)),
    volunteerTasks: state.volunteerTasks.map((t) => (t.id === taskId ? updatedTask : t)),
  };
}

/**
 * 4. Giao xử lý cho đơn vị / bộ phận (spec 3.3, AC-A02-3)
 */
export function assignDepartment(
  state: AppState,
  reportId: string,
  params: {
    department: string;
    dueAt?: string;
    note?: string;
    actor?: string;
  },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  const dueAt = params.dueAt || report.dueAt;
  const updatedReport: Report = {
    ...report,
    status: 'da_giao',
    department: params.department,
    dueAt,
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: 'da_giao',
        actor: params.actor || 'Cán bộ điều phối',
        note: params.note || `Giao cho ${params.department}`,
      },
    ],
  };

  const newNotifications: Notification[] = [];
  let notifCounter = state.notifications.length;
  for (const phone of updatedReport.followers) {
    notifCounter += 1;
    newNotifications.push({
      id: `TB-NOTIF-${notifCounter}`,
      phone,
      reportId: report.id,
      message: buildNotification('da_giao', {
        id: report.id,
        department: params.department,
        date: dueAt ? formatDate(dueAt) : undefined,
      }),
      createdAt: now,
      read: false,
      channel: 'sms_mo_phong',
    });
  }

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
    notifications: [...newNotifications, ...state.notifications],
  };
}

/**
 * 5. Hoàn thành xử lý phản ánh (spec 3.3, AC-A03)
 * Gửi thông báo đến toàn bộ follower của hồ sơ chính VÀ hồ sơ con đã gộp.
 */
export function completeReport(
  state: AppState,
  reportId: string,
  params: {
    resultPhotos: string[];
    resultNote: string;
    completedAt?: string;
    actor?: string;
  },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  if (params.resultPhotos.length < 1) {
    throw new Error('Cần ít nhất 1 ảnh kết quả sau xử lý');
  }
  if (params.resultNote.trim().length < 10) {
    throw new Error('Mô tả kết quả công việc phải từ 10 ký tự');
  }

  const completedAt = report.completedAt || params.completedAt || now;

  const updatedReport: Report = {
    ...report,
    status: 'hoan_thanh',
    resultPhotos: params.resultPhotos,
    resultNote: params.resultNote,
    completedAt,
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: 'hoan_thanh',
        actor: params.actor || 'Cán bộ xử lý',
        note: params.resultNote,
      },
    ],
  };

  // Thu thập tất cả follower (chính + con đã gộp)
  const allTargetReports = [
    updatedReport,
    ...state.reports.filter((r) => updatedReport.mergedChildren?.includes(r.id)),
  ];

  const newNotifications: Notification[] = [];
  let notifCounter = state.notifications.length;
  for (const target of allTargetReports) {
    for (const phone of target.followers) {
      notifCounter += 1;
      newNotifications.push({
        id: `TB-NOTIF-${notifCounter}`,
        phone,
        reportId: target.id,
        message: buildNotification('hoan_thanh', {
          id: target.id,
        }),
        createdAt: now,
        read: false,
        channel: 'sms_mo_phong',
      });
    }
  }

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
    notifications: [...newNotifications, ...state.notifications],
  };
}

/**
 * 6. Yêu cầu bổ sung thông tin (spec 3.3, AC-A02-8)
 */
export function requestSupplement(
  state: AppState,
  reportId: string,
  params: {
    reason: string;
    actor?: string;
  },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  if (!params.reason.trim()) {
    throw new Error('Lý do yêu cầu bổ sung không được để trống');
  }

  const updatedReport: Report = {
    ...report,
    status: 'can_bo_sung',
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: 'can_bo_sung',
        actor: params.actor || 'Cán bộ',
        note: params.reason,
      },
    ],
  };

  const newNotifications: Notification[] = [];
  let notifCounter = state.notifications.length;
  for (const phone of updatedReport.followers) {
    notifCounter += 1;
    newNotifications.push({
      id: `TB-NOTIF-${notifCounter}`,
      phone,
      reportId: report.id,
      message: buildNotification('can_bo_sung', {
        id: report.id,
        reason: params.reason,
      }),
      createdAt: now,
      read: false,
      channel: 'sms_mo_phong',
    });
  }

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
    notifications: [...newNotifications, ...state.notifications],
  };
}

/**
 * 7. Chuyển cơ quan khác (spec 3.3, AC-A02-8)
 */
export function transferAgency(
  state: AppState,
  reportId: string,
  params: {
    agency: string;
    reason: string;
    actor?: string;
  },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  if (!params.agency.trim() || !params.reason.trim()) {
    throw new Error('Cần cung cấp tên cơ quan và lý do chuyển');
  }

  const updatedReport: Report = {
    ...report,
    status: 'chuyen_co_quan',
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: 'chuyen_co_quan',
        actor: params.actor || 'Cán bộ',
        note: `Chuyển tới ${params.agency}: ${params.reason}`,
      },
    ],
  };

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
  };
}

/**
 * 8. Đóng hồ sơ (spec 3.3, AC-A02-3)
 */
export function closeReport(
  state: AppState,
  reportId: string,
  params:
    | {
        reason?: string;
        actor?: string;
      }
    | undefined,
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }

  const updatedReport: Report = {
    ...report,
    status: 'dong',
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: 'dong',
        actor: params?.actor || 'Cán bộ',
        note: params?.reason || 'Đóng hồ sơ',
      },
    ],
  };

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? updatedReport : r)),
  };
}

// BONUS B2 – HOÃN: chưa dùng trong UI lõi
/**
 * 9. Gộp hồ sơ (spec 3.3, 3.4, AC-A02-6, AC-A02-7)
 */
export function mergeReports(
  state: AppState,
  mainId: string,
  childIds: string[],
  params:
    | {
        actor?: string;
        note?: string;
      }
    | undefined,
  now: string
): AppState {
  const main = state.reports.find((r) => r.id === mainId);
  if (!main) {
    throw new Error(`Không tìm thấy hồ sơ chính ${mainId}`);
  }

  const children = state.reports.filter((r) => childIds.includes(r.id));
  if (children.length !== childIds.length) {
    throw new Error('Không tìm thấy một số hồ sơ cần gộp');
  }

  // Kiểm tra không gộp hồ sơ đã đóng
  const allReportsToMerge = [main, ...children];
  if (allReportsToMerge.some((r) => r.status === 'dong')) {
    throw new Error('Không thể gộp hồ sơ đã đóng');
  }

  // Kết hợp followers (hợp của tất cả)
  const combinedFollowers = Array.from(
    new Set([...main.followers, ...children.flatMap((c) => c.followers)])
  );

  // Cộng anonymousFollows
  const combinedAnonymous =
    main.anonymousFollows + children.reduce((sum, c) => sum + c.anonymousFollows, 0);

  // Ghép ảnh nối tiếp
  const combinedPhotos = [...main.photos, ...children.flatMap((c) => c.photos)];

  // Danh sách hồ sơ con
  const combinedChildren = Array.from(new Set([...(main.mergedChildren || []), ...childIds]));

  const dummyMain: Report = {
    ...main,
    followers: combinedFollowers,
    anonymousFollows: combinedAnonymous,
  };
  const newPriority = computePriority(dummyMain);

  const updatedMain: Report = {
    ...main,
    followers: combinedFollowers,
    anonymousFollows: combinedAnonymous,
    photos: combinedPhotos,
    mergedChildren: combinedChildren,
    priority: newPriority,
    timeline: [
      ...main.timeline,
      {
        at: now,
        status: main.status,
        actor: params?.actor || 'Cán bộ',
        note: params?.note || `Gộp ${childIds.join(', ')} vào hồ sơ`,
      },
    ],
  };

  const newNotifications: Notification[] = [];
  let notifCounter = state.notifications.length;
  const updatedReports = state.reports.map((r) => {
    if (r.id === mainId) {
      return updatedMain;
    }
    if (childIds.includes(r.id)) {
      const child = children.find((c) => c.id === r.id)!;
      // Sinh thông báo cho followers của hồ sơ con
      for (const phone of child.followers) {
        notifCounter += 1;
        newNotifications.push({
          id: `TB-NOTIF-${notifCounter}`,
          phone,
          reportId: child.id,
          message: buildNotification('da_gop', {
            id: child.id,
            mainId,
            count: combinedFollowers.length + combinedAnonymous,
          }),
          createdAt: now,
          read: false,
          channel: 'sms_mo_phong',
        });
      }

      return {
        ...r,
        status: 'da_gop' as const,
        statusBeforeMerge: child.status,
        mergedInto: mainId,
        timeline: [
          ...r.timeline,
          {
            at: now,
            status: 'da_gop' as const,
            actor: params?.actor || 'Cán bộ',
            note: `Gộp vào hồ sơ ${mainId}`,
          },
        ],
      };
    }
    return r;
  });

  return {
    ...state,
    reports: updatedReports,
    notifications: [...newNotifications, ...state.notifications],
  };
}

// BONUS B2 – HOÃN: chưa dùng trong UI lõi
/**
 * 10. Tách hồ sơ đã gộp (spec 3.3, AC-A02-7)
 */
export function splitReportAction(
  state: AppState,
  mainId: string,
  childId: string,
  params:
    | {
        actor?: string;
        note?: string;
      }
    | undefined,
  now: string
): AppState {
  const main = state.reports.find((r) => r.id === mainId);
  const child = state.reports.find((r) => r.id === childId);
  if (!main || !child) {
    throw new Error('Không tìm thấy hồ sơ chính hoặc hồ sơ con để tách');
  }

  // Phục hồi hồ sơ con
  const restoredStatus = child.statusBeforeMerge || 'moi';
  const updatedChild: Report = {
    ...child,
    status: restoredStatus,
    statusBeforeMerge: undefined,
    mergedInto: undefined,
    timeline: [
      ...child.timeline,
      {
        at: now,
        status: restoredStatus,
        actor: params?.actor || 'Cán bộ',
        note: params?.note || `Tách khỏi hồ sơ ${mainId}`,
      },
    ],
  };

  // Cập nhật lại hồ sơ chính
  const remainingChildren = (main.mergedChildren || []).filter((id) => id !== childId);

  // Xóa ảnh của child khỏi main (nếu có)
  const childPhotosSet = new Set(child.photos);
  const remainingPhotos = main.photos.filter((p) => !childPhotosSet.has(p));

  // Loại bỏ followers chỉ thuộc về child
  const childFollowersSet = new Set(child.followers);
  const remainingFollowers = main.followers.filter((f) => !childFollowersSet.has(f));

  const remainingAnonymous = Math.max(0, main.anonymousFollows - child.anonymousFollows);

  const dummyMain: Report = {
    ...main,
    followers: remainingFollowers,
    anonymousFollows: remainingAnonymous,
  };
  const newPriority = computePriority(dummyMain);

  const updatedMain: Report = {
    ...main,
    mergedChildren: remainingChildren,
    photos: remainingPhotos.length > 0 ? remainingPhotos : main.photos,
    followers: remainingFollowers,
    anonymousFollows: remainingAnonymous,
    priority: newPriority,
    timeline: [
      ...main.timeline,
      {
        at: now,
        status: main.status,
        actor: params?.actor || 'Cán bộ',
        note: `Tách hồ sơ ${childId}`,
      },
    ],
  };

  return {
    ...state,
    reports: state.reports.map((r) => {
      if (r.id === mainId) return updatedMain;
      if (r.id === childId) return updatedChild;
      return r;
    }),
  };
}

// BONUS B5 – HOÃN: chưa dùng trong UI lõi
/**
 * 11. Cán bộ tạo phản ánh hộ người dân (spec 3.3, AC-A01-8)
 */
export function createOnBehalf(
  state: AppState,
  params: {
    phone: string;
    category: Category;
    photos?: string[];
    lat: number;
    lng: number;
    address: string;
    description?: string;
    locationNote?: string;
    department?: string;
    dueAt?: string;
  },
  now: string
): { state: AppState; report: Report; notification: Notification } {
  // Tìm ID lớn nhất hiện tại
  let maxId = 0;
  for (const r of state.reports) {
    const match = r.id.match(/^TB-(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  const nextId = `TB-${String(maxId + 1).padStart(4, '0')}`;

  // Sinh secretCode 4 chữ số
  const secretCode = String(Math.floor(1000 + Math.random() * 9000));

  const cfg = getCategoryConfig(params.category);
  const department = params.department || cfg.suggestedDepartment;
  const slaDays = DEFAULT_DEADLINES[params.category] || cfg.defaultDays;
  const dueAt =
    params.dueAt || new Date(new Date(now).getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();

  const report: Report = {
    id: nextId,
    category: params.category,
    photos:
      params.photos && params.photos.length > 0 ? params.photos : ['/demo-photos/placeholder.jpg'],
    photosApproved: true,
    lat: params.lat,
    lng: params.lng,
    address: params.address,
    locationNote: params.locationNote,
    description: params.description,
    createdAt: now,
    status: 'da_tiep_nhan',
    priority: 'binh_thuong',
    department,
    dueAt,
    reporterPhone: params.phone,
    anonymous: false,
    subscribedLater: false,
    secretCode,
    onBehalf: true,
    followers: [params.phone],
    anonymousFollows: 0,
    timeline: [
      {
        at: now,
        status: 'da_tiep_nhan',
        actor: 'Cán bộ tạo hộ',
        note: 'Cán bộ tiếp nhận và tạo hồ sơ hộ người dân',
      },
    ],
  };

  const notification: Notification = {
    id: `TB-NOTIF-${state.notifications.length + 1}`,
    phone: params.phone,
    reportId: nextId,
    message: `Phường Trấn Biên đã tiếp nhận phản ánh #${nextId} tạo hộ bạn. Mã theo dõi: #${nextId}, mã bí mật: ${secretCode}.`,
    createdAt: now,
    read: false,
    channel: 'sms_mo_phong',
  };

  const nextState: AppState = {
    ...state,
    reports: [report, ...state.reports],
    notifications: [notification, ...state.notifications],
  };

  return {
    state: nextState,
    report,
    notification,
  };
}
