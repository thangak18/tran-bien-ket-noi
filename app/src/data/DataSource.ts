import { Category, Report, VolunteerTask } from '../domain/types';
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

  /** TNV: Gửi kết quả xác minh tại hiện trường */
  submitVolunteerTask(
    taskId: string,
    payload: {
      note?: string;
      photos?: string[];
      status?: string;
      verifiedCategory?: string;
    }
  ): Promise<VolunteerTask>;

  /** Cán bộ: Lấy danh sách hồ sơ cần xử lý */
  getOfficerReports(params?: OfficerReportQueryParams): Promise<Report[]>;

  /** Cán bộ: Tiếp nhận hồ sơ */
  officerAcceptReport(
    reportId: string,
    params?: {
      department?: string;
      dueAt?: string;
      category?: Category;
      note?: string;
    }
  ): Promise<Report>;

  /** Cán bộ: Giao tình nguyện viên xác minh hoặc nghiệm thu */
  officerAssignVolunteer(
    reportId: string,
    params: {
      taskType: 'xac_minh' | 'nghiem_thu';
      assignee: string;
      note?: string;
    }
  ): Promise<Report>;

  /** Cán bộ: Chuyển bộ phận chuyên trách xử lý */
  officerAssignDepartment(
    reportId: string,
    params: {
      department: string;
      dueAt?: string;
      note?: string;
    }
  ): Promise<Report>;

  /** Cán bộ: Đánh dấu hoàn thành xử lý */
  officerCompleteReport(
    reportId: string,
    params: {
      resultNote: string;
      resultPhotos: string[];
    }
  ): Promise<Report>;

  /** Cán bộ: Từ chối / Chuyển cơ quan khác */
  officerRejectReport(
    reportId: string,
    params: {
      reason: string;
      mode?: 'tu_choi' | 'chuyen_co_quan';
    }
  ): Promise<Report>;

  /** Cán bộ: Gộp phản ánh trùng lặp */
  officerMergeReport(reportId: string, targetId: string): Promise<Report>;

  /** Tải ảnh lên (trả về URL hoặc đường dẫn ảnh) */
  uploadPhoto(file: Blob | File, filename?: string): Promise<string>;
}
