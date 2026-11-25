import { AiSuggestionData, Category, Notification, Report, VolunteerTask } from '../domain/types';
import { SubmitReportPayload } from '../store/citizenActions';

export interface PublicKpiResult {
  totalReports: number;
  resolvedCount: number;
  overdueCount: number;
  avgResolutionDays: number;
}

export interface ReportQueryParams {
  category?: string;
  status?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  limit?: number;
  offset?: number;
}

export interface VolunteerTaskQueryParams {
  status?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

export interface OfficerReportQueryParams {
  status?: string;
  department?: string;
  overdueOnly?: boolean;
}

export interface CreateReportResult {
  report: Report;
  secretCode?: string;
  ownerToken?: string;
}

/** Kết quả xác minh/nghiệm thu tại hiện trường do TNV gửi (spec 4.2, AC-V02). */
export interface VerificationInput {
  exists: 'co' | 'khong' | 'khong_tim_thay';
  severity?: 'nhe' | 'trung_binh' | 'nguy_hiem';
  photo: string;
  note?: string;
}

export interface VolunteerOption {
  id: string;
  name: string;
}

/** Cán bộ tạo phản ánh hộ người dân (B5, AC-A01-8). */
export interface CreateOnBehalfInput {
  phone: string;
  category: Category;
  photos?: string[];
  lat: number;
  lng: number;
  address: string;
  description?: string;
  locationNote?: string;
}

export interface CreateOnBehalfResult {
  report: Report;
  /** Mã bí mật 4 số, chỉ hiển thị một lần cho cán bộ để đọc lại cho người dân. */
  secretCode: string;
}

/**
 * Mọi thao tác dữ liệu của giao diện đi qua hợp đồng này.
 * - LocalDataSource: chạy offline trên store + localStorage (mô phỏng, Giai đoạn 1).
 * - ApiDataSource: gọi API Hono (Giai đoạn 2). Lỗi được ném dưới dạng ApiError.
 */
export interface DataSource {
  /** Lấy danh sách phản ánh công khai */
  getReports(params?: ReportQueryParams): Promise<Report[]>;

  /** Lấy chi tiết một phản ánh theo mã TB-xxxx hoặc UUID */
  getReportById(idOrCode: string): Promise<Report | null>;

  /** Lấy thống kê KPI công khai */
  getPublicKpi(): Promise<PublicKpiResult>;

  /** Người dân gửi phản ánh mới */
  createReport(
    payload: SubmitReportPayload,
    options?: { idempotencyKey?: string }
  ): Promise<CreateReportResult>;

  /** Tra cứu hồ sơ bằng mã phản ánh + mã bí mật 4 số */
  lookupReport(code: string, secretCode: string): Promise<Report>;

  /** Đăng ký nhận tin / xác nhận quyền sở hữu bằng SĐT */
  claimReport(reportId: string, phone: string): Promise<Report>;

  /** Thông báo tiến độ của người dân đang đăng nhập SĐT (null: chưa đăng nhập) */
  getMyNotifications(): Promise<Notification[] | null>;

  /** Hồ sơ của người dân đang đăng nhập SĐT (hoặc lưu trên thiết bị này) */
  getMyReports(): Promise<Report[]>;

  /** Người xem trên thiết bị này có phải chủ hồ sơ (SĐT đã xác thực hoặc khoá chủ hồ sơ)? */
  isReportOwner(reportId: string): Promise<boolean>;

  /** Huỷ nhận tin của một số điện thoại cho phản ánh */
  unsubscribeReport(reportId: string, phone: string): Promise<Report>;
  /** Nhận hồ sơ về thiết bị bằng mã bí mật (link ?k=) */
  claimReportByKey(reportId: string, secretCode: string): Promise<Report>;
  /** Bổ sung thông tin / hình ảnh cho phản ánh */
  supplementReport(reportId: string, note: string, photos?: string[]): Promise<Report>;

  /** Đánh giá mức độ hài lòng hoặc yêu cầu mở lại */
  submitFeedback(
    reportId: string,
    feedback: {
      resolved: boolean;
      rating?: number;
      tags?: string[];
      comment?: string;
    }
  ): Promise<Report>;

  /** Theo dõi / Tôi cũng gặp sự cố này */
  followReport(reportId: string, phone?: string): Promise<void>;

  /** TNV: Lấy danh sách nhiệm vụ xác minh */
  getVolunteerTasks(params?: VolunteerTaskQueryParams): Promise<VolunteerTask[]>;

  /** TNV: Lấy chi tiết nhiệm vụ */
  getVolunteerTaskById(taskId: string): Promise<VolunteerTask | null>;

  /** TNV: Nhận nhiệm vụ */
  claimVolunteerTask(taskId: string): Promise<VolunteerTask>;

  /** TNV: Gửi kết quả xác minh/nghiệm thu tại hiện trường */
  submitVolunteerTask(taskId: string, input: VerificationInput): Promise<VolunteerTask>;

  /** Cán bộ: Lấy danh sách hồ sơ cần xử lý */
  getOfficerReports(params?: OfficerReportQueryParams): Promise<Report[]>;

  /** Cán bộ: Chi tiết hồ sơ (SĐT đã che, timeline có tên người thao tác) */
  getOfficerReport(idOrCode: string): Promise<Report | null>;

  /** Cán bộ: Danh sách tình nguyện viên đang hoạt động để giao việc */
  listVolunteers(): Promise<VolunteerOption[]>;

  /** Cán bộ: Tiếp nhận hồ sơ */
  officerAcceptReport(
    reportId: string,
    params?: {
      department?: string;
      dueAt?: string;
      category?: Category;
      note?: string;
      /** Phiên bản hồ sơ giao diện đang xem; lệch thì API trả 409 (xung đột cập nhật). */
      version?: number;
    }
  ): Promise<Report>;

  /** Cán bộ: Giao tình nguyện viên xác minh hoặc nghiệm thu (không chọn assignee = "TNV gần nhất nhận") */
  officerAssignVolunteer(
    reportId: string,
    params: {
      taskType: 'xac_minh' | 'nghiem_thu';
      assignee?: VolunteerOption | string | null;
      note?: string;
      version?: number;
    }
  ): Promise<Report>;

  /** Cán bộ: Chuyển bộ phận chuyên trách xử lý */
  officerAssignDepartment(
    reportId: string,
    params: {
      department: string;
      dueAt?: string;
      note?: string;
      version?: number;
    }
  ): Promise<Report>;

  /** Cán bộ: Đánh dấu hoàn thành xử lý */
  officerCompleteReport(
    reportId: string,
    params: {
      resultNote: string;
      resultPhotos: string[];
      /** Chỉ chế độ local (mô phỏng): ngày hoàn thành do cán bộ chọn. API ghi theo giờ máy chủ. */
      completedAt?: string;
      version?: number;
    }
  ): Promise<Report>;

  /** Cán bộ: Yêu cầu người dân bổ sung thông tin */
  officerRequestSupplement(
    reportId: string,
    params: { reason: string; version?: number }
  ): Promise<Report>;

  /** Cán bộ: Chuyển cơ quan khác xử lý */
  officerTransferAgency(
    reportId: string,
    params: { agency: string; reason: string; version?: number }
  ): Promise<Report>;

  /** Cán bộ: Xác nhận không có sự cố sau khi TNV báo "Không có" / "Không tìm thấy" */
  officerMarkUnverified(
    reportId: string,
    params?: { reason?: string; version?: number }
  ): Promise<Report>;

  /** Cán bộ: Đóng hồ sơ (mở lại → đóng sau nghiệm thu) */
  officerCloseReport(
    reportId: string,
    params?: { reason?: string; version?: number }
  ): Promise<Report>;

  /** Cán bộ: Gộp phản ánh trùng lặp vào hồ sơ chính */
  officerMergeReport(
    reportId: string,
    targetId: string,
    params?: { version?: number }
  ): Promise<Report>;

  /** Cán bộ: Tách hồ sơ đã gộp khỏi hồ sơ chính */
  officerSplitReport(
    mainId: string,
    childId: string,
    params?: { version?: number }
  ): Promise<Report>;

  /** Cán bộ: Tạo phản ánh hộ người dân */
  officerCreateOnBehalf(input: CreateOnBehalfInput): Promise<CreateOnBehalfResult>;

  /** Tải ảnh lên (trả về URL hoặc đường dẫn ảnh) */
  uploadPhoto(file: Blob | File, filename?: string): Promise<string>;

  /** Gợi ý loại sự cố từ ảnh bằng AI */
  suggestCategory(image: string): Promise<AiSuggestionData>;
}
