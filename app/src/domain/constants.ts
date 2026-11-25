import { Category, Status } from './types';

export interface CategoryConfig {
  key: Category;
  label: string;
  icon: string;
  suggestedDepartment: string;
  defaultDays: number;
}

export const CATEGORY_CONFIGS: readonly CategoryConfig[] = [
  {
    key: 'den_duong',
    label: 'Đèn đường',
    icon: 'Lightbulb',
    suggestedDepartment: 'Phòng KT-HT&ĐT – Đội chiếu sáng công cộng',
    defaultDays: 3,
  },
  {
    key: 'ngap_nuoc',
    label: 'Ngập nước',
    icon: 'Droplets',
    suggestedDepartment: 'Phòng KT-HT&ĐT – Đội thoát nước',
    defaultDays: 2,
  },
  {
    key: 'rac_thai',
    label: 'Rác thải',
    icon: 'Trash2',
    suggestedDepartment: 'Bộ phận Môi trường – Đội vệ sinh môi trường',
    defaultDays: 2,
  },
  {
    key: 'mat_duong',
    label: 'Mặt đường',
    icon: 'Construction',
    suggestedDepartment: 'Phòng KT-HT&ĐT – Đội duy tu đường',
    defaultDays: 5,
  },
] as const;

export const DEFAULT_DEADLINES: Record<Category, number> = {
  den_duong: 3,
  ngap_nuoc: 2,
  rac_thai: 2,
  mat_duong: 5,
};

export const DEPARTMENTS = [
  'Phòng KT-HT&ĐT – Đội chiếu sáng công cộng',
  'Phòng KT-HT&ĐT – Đội thoát nước',
  'Bộ phận Môi trường – Đội vệ sinh môi trường',
  'Phòng KT-HT&ĐT – Đội duy tu đường',
  'Khu phố (tổ dân phố)',
] as const;

export const VOLUNTEERS = ['Lê Thảo Vy', 'Trần Quốc Bảo', 'Phạm Ngọc Hân'] as const;

export const DEFAULT_OFFICER = 'Nguyễn Văn Minh – Cán bộ tiếp nhận';
export const DEMO_CITIZEN = {
  name: 'Ông Tư',
  phone: '0909000068',
  phoneFormatted: '0909 000 068',
};

export const DEMO_NOW = '2026-11-24T09:00:00+07:00';

export interface StatusConfig {
  officerLabel: string;
  publicLabel: string;
  step: 1 | 2 | 3 | 4 | 'exception';
  color: 'gray' | 'blue' | 'orange' | 'green' | 'yellow' | 'purple' | 'red';
  icon: string;
}

export const STATUS_CONFIGS: Record<Status, StatusConfig> = {
  moi: {
    officerLabel: 'Mới',
    publicLabel: 'Chờ tiếp nhận',
    step: 1,
    color: 'gray',
    icon: 'Send',
  },
  da_tiep_nhan: {
    officerLabel: 'Đã tiếp nhận',
    publicLabel: 'Đã tiếp nhận',
    step: 2,
    color: 'blue',
    icon: 'Inbox',
  },
  cho_xac_minh: {
    officerLabel: 'Chờ xác minh',
    publicLabel: 'Đã tiếp nhận · Đang kiểm tra tại chỗ',
    step: 2,
    color: 'blue',
    icon: 'Search',
  },
  da_giao: {
    officerLabel: 'Đã giao xử lý',
    publicLabel: 'Đang xử lý',
    step: 3,
    color: 'orange',
    icon: 'Wrench',
  },
  hoan_thanh: {
    officerLabel: 'Hoàn thành – chờ người dân',
    publicLabel: 'Đã xử lý',
    step: 4,
    color: 'green',
    icon: 'CheckCircle2',
  },
  dong: {
    officerLabel: 'Đã đóng',
    publicLabel: 'Đã xử lý',
    step: 4,
    color: 'green',
    icon: 'CheckCircle2',
  },
  mo_lai: {
    officerLabel: 'Mở lại',
    publicLabel: 'Đang xử lý lại',
    step: 3,
    color: 'orange',
    icon: 'RotateCcw',
  },
  can_bo_sung: {
    officerLabel: 'Cần bổ sung',
    publicLabel: 'Cần bổ sung thông tin',
    step: 'exception',
    color: 'yellow',
    icon: 'AlertCircle',
  },
  da_gop: {
    officerLabel: 'Đã gộp',
    publicLabel: 'Đã gộp vào #…',
    step: 'exception',
    color: 'purple',
    icon: 'Merge',
  },
  chuyen_co_quan: {
    officerLabel: 'Chuyển cơ quan khác',
    publicLabel: 'Đã chuyển cơ quan khác',
    step: 'exception',
    color: 'gray',
    icon: 'ArrowRightLeft',
  },
  khong_xac_nhan: {
    officerLabel: 'Không xác nhận được',
    publicLabel: 'Không xác nhận được sự cố',
    step: 'exception',
    color: 'gray',
    icon: 'XCircle',
  },
};

export function publicLabel(status: Status): string {
  return STATUS_CONFIGS[status].publicLabel;
}

export function officerLabel(status: Status): string {
  return STATUS_CONFIGS[status].officerLabel;
}

export function progressStep(status: Status): 1 | 2 | 3 | 4 | 'exception' {
  return STATUS_CONFIGS[status].step;
}

/**
 * Bộ chip đánh giá (spec AC-C06-5, UT-011 mục 6)
 */
export const FEEDBACK_POSITIVE_TAGS: readonly string[] = [
  'Xử lý nhanh',
  'Sạch sẽ, gọn gàng',
  'Làm đúng chỗ',
  'Được báo tin đầy đủ',
] as const;

export const FEEDBACK_NEGATIVE_TAGS: readonly string[] = [
  'Xử lý chậm',
  'Chưa triệt để',
  'Thiếu thông báo',
  'Ảnh kết quả chưa rõ',
] as const;

export const ALL_FEEDBACK_TAGS: readonly string[] = [
  ...FEEDBACK_POSITIVE_TAGS,
  ...FEEDBACK_NEGATIVE_TAGS,
] as const;

/**
 * Tìm cấu hình danh mục sự cố (spec 3.1). Là hàm thuần nên đặt ở domain/ để màn hình và store cùng dùng.
 */
export function getCategoryConfig(category: Category) {
  const cfg = CATEGORY_CONFIGS.find((c) => c.key === category);
  if (!cfg) {
    throw new Error(`Không tìm thấy cấu hình cho loại sự cố: ${category}`);
  }
  return cfg;
}
