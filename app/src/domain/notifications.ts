import { Status } from './types';
import { progressStep } from './constants';

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
