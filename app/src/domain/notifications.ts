import { Notification, Report, Status, VolunteerTask } from './types';
import { CATEGORY_CONFIGS, progressStep } from './constants';
import { formatDate } from './format';
import { isDueSoon, isOverdue } from './sorting';

export type NotificationEvent =
  | 'submit_success'
  | 'da_tiep_nhan'
  | 'da_giao'
  | 'hoan_thanh'
  | 'can_bo_sung'
  | 'da_gop'
  | 'mo_lai'
  | 'subscribe_later';

export interface NotificationParams {
  id: string;
  date?: string;
  department?: string;
  reason?: string;
  mainId?: string;
  count?: number;
}

export type PortalNotificationKind =
  | 'new_report'
  | 'overdue'
  | 'due_soon'
  | 'reopened'
  | 'tnv_done'
  | 'tnv_assigned'
  | 'tnv_open'
  | 'tnv_recheck';

export interface PortalNotification {
  id: string;
  kind: PortalNotificationKind;
  badge: string;
  title: string;
  message: string;
  at: string;
  reportId: string;
  taskId?: string;
  to: string;
  urgent?: boolean;
}

const TEMPLATES: Record<NotificationEvent, (params: NotificationParams) => string> = {
  submit_success: (p) =>
    `Phường Trấn Biên đã nhận phản ánh #${p.id}. Bạn sẽ nhận tin khi có cập nhật.`,
  da_tiep_nhan: (p) => `Phản ánh #${p.id} đã được tiếp nhận. Dự kiến xử lý trước ${p.date ?? ''}.`,
  da_giao: (p) => `#${p.id} đã giao ${p.department ?? ''}, hạn ${p.date ?? ''}.`,
  hoan_thanh: (p) => `#${p.id} đã xử lý xong. Mời bạn xem ảnh kết quả và đánh giá.`,
  can_bo_sung: (p) => `#${p.id} cần bổ sung: ${p.reason ?? ''}.`,
  da_gop: (p) =>
    `#${p.id} được gộp vào #${p.mainId ?? ''} cùng ${p.count ?? 0} người. Bạn sẽ nhận cập nhật của hồ sơ chung.`,
  mo_lai: (p) => `Phường đã nhận ý kiến về #${p.id} và sẽ kiểm tra lại.`,
  subscribe_later: (p) => `Bạn đã đăng ký nhận tin cho #${p.id}. Số này chỉ dùng cho phản ánh này.`,
};

/**
 * Xây dựng chuỗi thông báo theo sự kiện và tham số (spec 3.4, UT-017.3)
 */
export function buildNotification(event: NotificationEvent, params: NotificationParams): string {
  const builder = TEMPLATES[event];
  if (!builder) return '';
  return builder(params);
}

/**
 * Kiểm tra xem khi chuyển trạng thái có cần sinh thông báo hay không (spec 3.4, UT-017.4)
 * Chuyển cho_xac_minh -> da_tiep_nhan không đổi nhãn công khai nên không sinh thông báo
 */
export function shouldNotifyOnTransition(prevStatus: Status, nextStatus: Status): boolean {
  if (prevStatus === 'cho_xac_minh' && nextStatus === 'da_tiep_nhan') {
    return false;
  }
  if (nextStatus === 'can_bo_sung') {
    return true;
  }
  const prevStep = progressStep(prevStatus);
  const nextStep = progressStep(nextStatus);
  return prevStep !== nextStep;
}

function getCategoryLabel(category: Report['category']): string {
  return CATEGORY_CONFIGS.find((c) => c.key === category)?.label ?? category;
}

function stripPhoneNumbers(text: string): string {
  return text.replace(/\b0\d{9}\b/g, '***');
}

function latestTimestamp(report: Report): string {
  const last = report.timeline[report.timeline.length - 1];
  return last?.at ?? report.createdAt;
}

/**
 * Sinh danh sách thông báo điều hành cho Cán bộ phường từ dữ liệu hiện tại (hàm thuần).
 * Gồm: phản ánh mới từ dân, hồ sơ mở lại ("Chưa giải quyết"), hồ sơ quá hạn / sắp đến hạn,
 * và kết quả xác minh/nghiệm thu mới từ TNV.
 */
export function buildOfficerNotifications(
  reports: Report[],
  tasks: VolunteerTask[],
  now: string
): PortalNotification[] {
  const items: PortalNotification[] = [];
  const reportMap = new Map(reports.map((r) => [r.id, r]));

  for (const r of reports) {
    const cat = getCategoryLabel(r.category);

    if (r.status === 'mo_lai') {
      items.push({
        id: `officer:reopened:${r.id}`,
        kind: 'reopened',
        badge: 'Mở lại',
        title: `Người dân báo chưa giải quyết #${r.id}`,
        message: `${cat} tại ${r.address} đã được mở lại và cần kiểm tra, nghiệm thu.`,
        at: latestTimestamp(r),
        reportId: r.id,
        to: `/can-bo/${r.id}`,
        urgent: true,
      });
    }

    if (isOverdue(r, now)) {
      const dueStr = r.dueAt ? formatDate(r.dueAt) : '';
      items.push({
        id: `officer:overdue:${r.id}`,
        kind: 'overdue',
        badge: 'Quá hạn',
        title: `Quá hạn xử lý #${r.id}`,
        message: `${cat} tại ${r.address} đã quá hạn${dueStr ? ` (${dueStr})` : ''}. Cần đôn đốc xử lý ngay.`,
        at: r.dueAt ?? latestTimestamp(r),
        reportId: r.id,
        to: `/can-bo/${r.id}`,
        urgent: true,
      });
    } else if (isDueSoon(r, now)) {
      const dueStr = r.dueAt ? formatDate(r.dueAt) : '';
      items.push({
        id: `officer:due_soon:${r.id}`,
        kind: 'due_soon',
        badge: 'Sắp đến hạn',
        title: `Sắp đến hạn #${r.id}`,
        message: `${cat} tại ${r.address} đến hạn trước ${dueStr}.`,
        at: latestTimestamp(r),
        reportId: r.id,
        to: `/can-bo/${r.id}`,
      });
    }

    if (r.status === 'moi') {
      items.push({
        id: `officer:new:${r.id}`,
        kind: 'new_report',
        badge: 'Phản ánh mới',
        title: `Phản ánh mới từ người dân #${r.id}`,
        message: `${cat} tại ${r.address}. Chờ cán bộ tiếp nhận và phân công.`,
        at: r.createdAt,
        reportId: r.id,
        to: `/can-bo/${r.id}`,
      });
    }
  }

  for (const task of tasks) {
    if (task.status !== 'xong' || !task.result) continue;
    const report = reportMap.get(task.reportId);
    if (!report || report.status === 'dong' || report.status === 'hoan_thanh') continue;

    const resultText =
      task.result.exists === 'co'
        ? 'Xác nhận có sự cố'
        : task.result.exists === 'khong'
          ? 'Không phát hiện sự cố'
          : 'Không tìm thấy vị trí';

    items.push({
      id: `officer:tnv_done:${task.id}`,
      kind: 'tnv_done',
      badge: 'Kết quả TNV',
      title: `TNV đã gửi kết quả #${report.id}`,
      message: `${task.assignee ?? 'Tình nguyện viên'} báo cáo: ${resultText}${task.result.note ? ` – ${task.result.note}` : ''}.`,
      at: task.result.at,
      reportId: report.id,
      taskId: task.id,
      to: `/can-bo/${report.id}`,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * Sinh danh sách thông báo chỉ thị từ Cán bộ phường cho Tình nguyện viên (hàm thuần).
 * Tuyệt đối không chứa SĐT người dân (spec 7.7, AC-V01-1).
 */
export function buildVolunteerNotifications(
  reports: Report[],
  tasks: VolunteerTask[],
  volunteerName: string | null,
  now: string
): PortalNotification[] {
  const reportMap = new Map(reports.map((r) => [r.id, r]));
  const items: PortalNotification[] = [];

  for (const task of tasks) {
    if (task.status === 'xong') continue;
    if (task.assignee !== null && volunteerName && task.assignee !== volunteerName) continue;

    const report = reportMap.get(task.reportId);
    if (!report) continue;

    const cat = getCategoryLabel(report.category);
    const directiveEntry = [...report.timeline]
      .reverse()
      .find((entry) => entry.status === 'cho_xac_minh' || entry.status === 'mo_lai');
    const directiveNote = directiveEntry?.note ? stripPhoneNumbers(directiveEntry.note) : '';
    const at = directiveEntry?.at ?? report.createdAt ?? now;

    if (task.type === 'nghiem_thu') {
      items.push({
        id: `tnv:recheck:${task.id}`,
        kind: 'tnv_recheck',
        badge: 'Chỉ thị nghiệm thu',
        title: `Chỉ thị nghiệm thu sau xử lý #${report.id}`,
        message: `${cat} tại ${stripPhoneNumbers(report.address)}. ${directiveNote || 'Cán bộ yêu cầu kiểm tra lại hiện trường sau phản hồi của người dân.'}`,
        at,
        reportId: report.id,
        taskId: task.id,
        to: `/tnv/${task.id}`,
        urgent: true,
      });
    } else if (task.assignee !== null) {
      items.push({
        id: `tnv:assigned:${task.id}`,
        kind: 'tnv_assigned',
        badge: 'Chỉ thị cán bộ',
        title: `Cán bộ giao xác minh #${report.id}`,
        message: `${cat} tại ${stripPhoneNumbers(report.address)}. ${directiveNote || 'Vui lòng đến hiện trường xác minh và gửi ảnh báo cáo.'}`,
        at,
        reportId: report.id,
        taskId: task.id,
        to: `/tnv/${task.id}`,
        urgent: true,
      });
    } else {
      items.push({
        id: `tnv:open:${task.id}`,
        kind: 'tnv_open',
        badge: 'Nhiệm vụ mở',
        title: `Nhiệm vụ xác minh quanh đây #${report.id}`,
        message: `${cat} tại ${stripPhoneNumbers(report.address)}. Chưa có TNV nhận – chạm để nhận nhiệm vụ.`,
        at,
        reportId: report.id,
        taskId: task.id,
        to: `/tnv/${task.id}`,
      });
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * Gộp thông báo realtime trong store với các mốc xử lý (đặc biệt khi đã hoàn thành)
 * của những hồ sơ thuộc SĐT người dân đang đăng nhập.
 */
export function buildCitizenNotifications(
  reports: Report[],
  storedNotifications: Notification[],
  phone?: string
): Notification[] {
  if (!phone) return [];

  const existing = storedNotifications.filter((n) => n.phone === phone);
  const existingKeys = new Set(existing.map((n) => `${n.reportId}:${n.message}`));
  const derived: Notification[] = [];

  for (const r of reports) {
    const isMine = r.reporterPhone === phone || r.followers.includes(phone);
    if (!isMine) continue;

    if (r.status === 'hoan_thanh' || r.status === 'dong') {
      const msg = buildNotification('hoan_thanh', { id: r.id });
      const key = `${r.id}:${msg}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        derived.push({
          id: `derived-complete-${r.id}`,
          phone,
          reportId: r.id,
          message: msg,
          createdAt: r.completedAt ?? latestTimestamp(r),
          read: r.status === 'dong',
          channel: 'sms_mo_phong',
        });
      }
    } else if (r.status === 'can_bo_sung') {
      const lastNote = r.timeline[r.timeline.length - 1]?.note ?? 'Cần bổ sung thêm thông tin';
      const msg = buildNotification('can_bo_sung', { id: r.id, reason: lastNote });
      const key = `${r.id}:${msg}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        derived.push({
          id: `derived-supplement-${r.id}`,
          phone,
          reportId: r.id,
          message: msg,
          createdAt: latestTimestamp(r),
          read: false,
          channel: 'sms_mo_phong',
        });
      }
    }
  }

  return [...existing, ...derived].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
