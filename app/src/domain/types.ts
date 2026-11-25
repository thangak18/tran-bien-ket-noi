/**
 * Phân loại sự cố (spec 3.1)
 */
export const CATEGORIES = ['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Trạng thái nội bộ (spec 3.2)
 */
export const STATUSES = [
  'moi',
  'da_tiep_nhan',
  'cho_xac_minh',
  'da_giao',
  'hoan_thanh',
  'dong',
  'mo_lai',
  'can_bo_sung',
  'da_gop',
  'chuyen_co_quan',
  'khong_xac_nhan',
] as const;
export type Status = (typeof STATUSES)[number];

/**
 * Mức độ ưu tiên (spec 3.6, 4.1)
 */
export type Priority = 'cao' | 'binh_thuong';

/**
 * Vai trò người thao tác (spec 2)
 */
export type Role = 'ND' | 'CB' | 'TNV' | 'system';

/**
 * Mục tiến trình lịch sử (spec 4.1)
 */
export interface TimelineEntry {
  at: string; // ISO date string
  status: Status;
  actor: string;
  note?: string;
}

/**
 * Đánh giá của người dân (spec 4.1)
 */
export interface Feedback {
  resolved: boolean;
  rating?: number; // 1-5
  tags?: string[];
  comment?: string;
  at: string; // ISO
}

/**
 * Mô hình dữ liệu phản ánh đầy đủ (spec 4.1)
 */
export interface Report {
  id: string; // TB-xxxx
  category: Category;
  photos: string[];
  photosApproved: boolean;
  lat: number;
  lng: number;
  address: string;
  locationNote?: string;
  title?: string;
  description?: string;
  createdAt: string; // ISO
  status: Status;
  statusBeforeMerge?: Status;
  priority: Priority;
  department?: string;
  dueAt?: string; // ISO
  reporterPhone?: string;
  anonymous: boolean;
  subscribedLater: boolean;
  secretCode: string; // 4 số bí mật
  onBehalf: boolean;
  followers: string[];
  anonymousFollows: number;
  mergedInto?: string;
  mergedChildren?: string[];
  suspectedDuplicateOf?: string[];
  resultPhotos?: string[];
  resultNote?: string;
  completedAt?: string; // ISO
  feedback?: Feedback;
  timeline: TimelineEntry[];
  /** Chỉ có khi dữ liệu đến từ API: tổng người cùng báo (server không trả danh sách SĐT). */
  followerCount?: number;
  /** Chỉ có khi dữ liệu đến từ API: số phiên bản để phát hiện xung đột cập nhật (409). */
  version?: number;
  /** Gợi ý loại sự cố từ AI (B1: deepseek hoặc mock). */
  aiSuggestion?: AiSuggestionData | null;
}

export interface AiSuggestionData {
  category: Category | null;
  confidence: number;
  provider: 'deepseek' | 'mock';
  reason?: string;
}

/**
 * Dữ liệu phản ánh công khai (spec 4.1, privacy.ts)
 */
export interface PublicReport {
  id: string;
  category: Category;
  photos: string[];
  lat: number;
  lng: number;
  address: string;
  locationNote?: string;
  title?: string;
  description?: string;
  createdAt: string;
  status: Status;
  department?: string;
  dueAt?: string;
  followerCount: number;
  mergedInto?: string;
  resultPhotos?: string[];
  resultNote?: string;
  completedAt?: string;
  rating?: number;
  timeline: { at: string; status: Status; actor: string; note?: string }[];
}

/**
 * Nhiệm vụ tình nguyện viên (spec 4.2)
 */
export type VolunteerTaskType = 'xac_minh' | 'nghiem_thu';
export type VolunteerTaskStatus = 'cho_nhan' | 'dang_lam' | 'xong';

export interface VolunteerTaskResult {
  exists: 'co' | 'khong' | 'khong_tim_thay';
  severity?: 'nhe' | 'trung_binh' | 'nguy_hiem';
  photo: string;
  note?: string;
  at: string;
}

export interface VolunteerTask {
  id: string; // NV-xxx
  reportId: string;
  type: VolunteerTaskType;
  assignee: string | null;
  status: VolunteerTaskStatus;
  result?: VolunteerTaskResult;
}

/**
 * Thông báo (spec 4.3)
 */
export interface Notification {
  id: string;
  phone: string;
  reportId: string;
  message: string;
  createdAt: string;
  read: boolean;
  channel: 'app' | 'sms_mo_phong';
}

export type FontScale = 'small' | 'normal' | 'large' | 'xlarge';

/**
 * Cài đặt ứng dụng theo thiết bị (spec 4.4)
 */
export interface Settings {
  seniorMode: boolean;
  fontScale?: FontScale;
  phone?: string;
  demoNow: string; // ISO
  deviceReports: { id: string; secretCode: string; code?: string; ownerToken?: string }[];
  anonymousLog: string[]; // ISO
}

/**
 * Bản nháp gửi phản ánh
 */
export interface ReportDraft {
  photos: string[];
  lat?: number;
  lng?: number;
  address?: string;
  locationNote?: string;
  category?: Category;
  title?: string;
  description?: string;
  /** Gợi ý AI của ảnh đầu tiên; giữ qua bước đăng nhập để hồ sơ gửi đi vẫn kèm gợi ý (B1). */
  aiSuggestion?: AiSuggestionData;
  /** Khoá nhận diện ảnh đã gửi cho AI (độ dài + 64 ký tự đầu), đổi ảnh thì gọi lại AI. */
  aiPhotoKey?: string;
}
