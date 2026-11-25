import { Category, Feedback, Notification, Report, VolunteerTask } from '../domain/types';
import { canSendAnonymous } from '../domain/access';
import { computePriority } from '../domain/sorting';
import { buildNotification } from '../domain/notifications';
import { transition } from '../domain/status';
import { AppState } from './AppStore';
import { randomInt } from '../lib/random';

export interface SubmitReportPayload {
  category: Category;
  photos: string[];
  lat: number;
  lng: number;
  address: string;
  locationNote?: string;
  description?: string;
  phone?: string;
  anonymous?: boolean;
}

/**
 * Sinh mã số phản ánh kế tiếp (TB-0065, TB-0066, ...)
 */
export function getNextReportId(reports: Report[]): string {
  let maxNum = 64;
  for (const r of reports) {
    const match = r.id.match(/^TB-(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `TB-${(maxNum + 1).toString().padStart(4, '0')}`;
}

/**
 * Sinh mã bí mật 4 chữ số
 */
export function generateSecretCode(): string {
  return randomInt(1000, 10000).toString();
}

/**
 * Gửi phản ánh mới (spec 3.3, 3.4a, 3.4b, AC-C04)
 */
export function submitReport(
  state: AppState,
  payload: SubmitReportPayload,
  now: string
): { state: AppState; report: Report } {
  const isAnon = !!payload.anonymous;

  if (isAnon) {
    if (!canSendAnonymous(state.settings.anonymousLog, now)) {
      throw new Error(
        'Hôm nay bạn đã gửi 5 phản ánh ẩn danh. Vui lòng để lại số điện thoại để gửi tiếp.'
      );
    }
  }

  const newId = getNextReportId(state.reports);
  const secretCode = generateSecretCode();

  const followers = !isAnon && payload.phone ? [payload.phone] : [];
  const anonymousFollows = isAnon ? 1 : 0;

  const newReport: Report = {
    id: newId,
    category: payload.category,
    photos: payload.photos,
    photosApproved: true,
    lat: payload.lat,
    lng: payload.lng,
    address: payload.address,
    locationNote: payload.locationNote,
    description: payload.description,
    createdAt: now,
    status: 'moi',
    priority: 'binh_thuong',
    department: undefined,
    dueAt: undefined,
    reporterPhone: !isAnon ? payload.phone : undefined,
    anonymous: isAnon,
    subscribedLater: false,
    secretCode,
    onBehalf: false,
    followers,
    anonymousFollows,
    timeline: [
      {
        at: now,
        status: 'moi',
        actor: 'Người dân',
        note: 'Đã gửi phản ánh',
      },
    ],
  };

  const newNotifications: Notification[] = [...state.notifications];
  if (!isAnon && payload.phone) {
    newNotifications.unshift({
      id: `${newId}_submit_${Date.now()}`,
      phone: payload.phone,
      reportId: newId,
      message: buildNotification('submit_success', { id: newId }),
      createdAt: now,
      read: false,
      channel: 'sms_mo_phong',
    });
  }

  const newDeviceReports = [
    { id: newId, secretCode },
    ...state.settings.deviceReports.filter((d) => d.id !== newId),
  ];

  const newAnonymousLog = isAnon
    ? [now, ...state.settings.anonymousLog]
    : state.settings.anonymousLog;

  const nextState: AppState = {
    ...state,
    reports: [newReport, ...state.reports],
    notifications: newNotifications,
    draft: { photos: [] },
    settings: {
      ...state.settings,
      deviceReports: newDeviceReports,
      anonymousLog: newAnonymousLog,
    },
  };

  return { state: nextState, report: newReport };
}

// BONUS B2 – HOÃN: chưa dùng trong UI lõi
/**
 * Theo dõi hồ sơ hoặc "Tôi cũng gặp" (spec 3.4b, AC-C04-7)
 */
export function followReport(
  state: AppState,
  reportId: string,
  phoneOrAnonymous: { phone?: string; anonymous?: boolean }
): AppState {
  const updatedReports = state.reports.map((r) => {
    if (r.id !== reportId) return r;

    const followers = [...r.followers];
    let anonymousFollows = r.anonymousFollows;

    if (phoneOrAnonymous.phone) {
      if (!followers.includes(phoneOrAnonymous.phone)) {
        followers.push(phoneOrAnonymous.phone);
      }
    } else if (phoneOrAnonymous.anonymous) {
      anonymousFollows += 1;
    }

    const dummyReport: Report = { ...r, followers, anonymousFollows };
    const priority = computePriority(dummyReport);

    return {
      ...r,
      followers,
      anonymousFollows,
      priority,
    };
  });

  return {
    ...state,
    reports: updatedReports,
  };
}

/**
 * Đăng ký nhận tin sau cho hồ sơ ẩn danh (spec 3.4b, AC-C06-9, UT-021.3c)
 */
export function subscribeLater(
  state: AppState,
  reportId: string,
  phone: string,
  now: string
): AppState {
  const targetReport = state.reports.find((r) => r.id === reportId);
  if (!targetReport) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }
  if (!targetReport.anonymous) {
    throw new Error('Chỉ có thể đăng ký nhận tin cho hồ sơ ẩn danh');
  }

  const updatedReports = state.reports.map((r) => {
    if (r.id !== reportId) return r;
    const followers = r.followers.includes(phone) ? r.followers : [...r.followers, phone];
    return {
      ...r,
      followers,
      subscribedLater: true,
    };
  });

  const newNotification: Notification = {
    id: `${reportId}_sub_${Date.now()}`,
    phone,
    reportId,
    message: buildNotification('subscribe_later', { id: reportId }),
    createdAt: now,
    read: false,
    channel: 'sms_mo_phong',
  };

  return {
    ...state,
    reports: updatedReports,
    notifications: [newNotification, ...state.notifications],
  };
}

/**
 * Huỷ nhận tin cho hồ sơ ẩn danh (spec AC-C06-9, UT-021.3d)
 */
export function unsubscribe(state: AppState, reportId: string, phone: string): AppState {
  const updatedReports = state.reports.map((r) => {
    if (r.id !== reportId) return r;
    const followers = r.followers.filter((p) => p !== phone);
    return {
      ...r,
      followers,
      subscribedLater: followers.length > 0,
    };
  });

  return {
    ...state,
    reports: updatedReports,
  };
}

/**
 * Thêm hồ sơ vào deviceReports khi mở qua link theo dõi đúng k (spec 3.4a, UT-021.3f)
 */
export function claimByLink(state: AppState, reportId: string, secretCode: string): AppState {
  const target = state.reports.find((r) => r.id === reportId);
  if (!target || target.secretCode !== secretCode) {
    return state;
  }

  const exists = state.settings.deviceReports.some(
    (d) => d.id === reportId && d.secretCode === secretCode
  );
  if (exists) return state;

  return {
    ...state,
    settings: {
      ...state.settings,
      deviceReports: [{ id: reportId, secretCode }, ...state.settings.deviceReports],
    },
  };
}

/**
 * Tra cứu hồ sơ theo mã + 4 số cuối SĐT hoặc mã bí mật (spec AC-C05-1, UT-021.3g)
 */
export function lookupReport(reports: Report[], reportId: string, code4: string): Report | null {
  const report = reports.find((r) => r.id === reportId);
  if (!report) return null;

  if (report.secretCode === code4) return report;
  if (report.reporterPhone && report.reporterPhone.endsWith(code4)) return report;

  return null;
}

/**
 * Gửi đánh giá kết quả xử lý (spec 3.3, AC-C06-5, UT-021.4, 5, 6)
 */
export function submitFeedback(
  state: AppState,
  reportId: string,
  feedback: { resolved: boolean; rating?: number; tags?: string[]; comment?: string },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }
  if (report.status !== 'hoan_thanh') {
    throw new Error('Chỉ có thể đánh giá phản ánh đang ở trạng thái hoàn thành');
  }

  const fullFeedback: Feedback = {
    resolved: feedback.resolved,
    rating: feedback.rating,
    tags: feedback.tags,
    comment: feedback.comment,
    at: now,
  };

  if (feedback.resolved) {
    const { report: updated } = transition(report, 'dong', 'system', 'Người dân', now, {
      feedback: fullFeedback,
      note: 'Người dân đánh giá: Đã giải quyết',
    });

    return {
      ...state,
      reports: state.reports.map((r) => (r.id === reportId ? updated : r)),
    };
  } else {
    // Chưa giải quyết -> chuyển sang mo_lai và sinh VolunteerTask nghiem_thu
    const { report: updated } = transition(report, 'mo_lai', 'system', 'Người dân', now, {
      feedback: fullFeedback,
      note: feedback.comment
        ? `Người dân báo chưa giải quyết: ${feedback.comment}`
        : 'Người dân báo chưa giải quyết',
    });

    const nextTaskId = `NV-${(state.volunteerTasks.length + 1).toString().padStart(3, '0')}`;
    const newTask: VolunteerTask = {
      id: nextTaskId,
      reportId,
      type: 'nghiem_thu',
      assignee: null,
      status: 'cho_nhan',
    };

    // Sinh thông báo mở lại cho followers
    const newNotifications: Notification[] = [...state.notifications];
    for (const phone of report.followers) {
      newNotifications.unshift({
        id: `${reportId}_reopen_${Date.now()}_${phone}`,
        phone,
        reportId,
        message: buildNotification('mo_lai', { id: reportId }),
        createdAt: now,
        read: false,
        channel: 'sms_mo_phong',
      });
    }

    return {
      ...state,
      reports: state.reports.map((r) => (r.id === reportId ? updated : r)),
      volunteerTasks: [newTask, ...state.volunteerTasks],
      notifications: newNotifications,
    };
  }
}

/**
 * Bổ sung thông tin khi hồ sơ ở trạng thái can_bo_sung (spec 3.3, AC-C06-7, UT-021.7)
 */
export function supplementReport(
  state: AppState,
  reportId: string,
  supplement: {
    photos?: string[];
    lat?: number;
    lng?: number;
    address?: string;
    note?: string;
  },
  now: string
): AppState {
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error(`Không tìm thấy hồ sơ ${reportId}`);
  }
  if (report.status !== 'can_bo_sung') {
    throw new Error('Chỉ có thể bổ sung hồ sơ ở trạng thái cần bổ sung');
  }

  const { report: updated } = transition(report, 'moi', 'ND', 'Người dân', now, {
    note: supplement.note ?? 'Người dân đã bổ sung thông tin',
  });

  const finalReport: Report = {
    ...updated,
    photos: supplement.photos ?? updated.photos,
    lat: supplement.lat ?? updated.lat,
    lng: supplement.lng ?? updated.lng,
    address: supplement.address ?? updated.address,
  };

  return {
    ...state,
    reports: state.reports.map((r) => (r.id === reportId ? finalReport : r)),
  };
}
