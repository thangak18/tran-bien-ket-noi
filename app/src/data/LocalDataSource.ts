import {
  DataSource,
  PublicKpiResult,
  ReportQueryParams,
  VolunteerTaskQueryParams,
  OfficerReportQueryParams,
  CreateReportResult,
  VerificationInput,
  VolunteerOption,
  CreateOnBehalfInput,
  CreateOnBehalfResult,
  FollowResult,
} from './DataSource';
import {
  AiSuggestionData,
  CATEGORIES,
  Category,
  Notification,
  Priority,
  Report,
  VolunteerTask,
} from '../domain/types';
import { VOLUNTEERS } from '../domain/constants';
import {
  SubmitReportPayload,
  submitReport,
  lookupReport,
  subscribeLater,
  supplementReport,
  submitFeedback,
  followReport,
  unsubscribe,
  claimByLink,
} from '../store/citizenActions';
import {
  acceptReport,
  assignVolunteer,
  assignDepartment,
  completeReport,
  transferAgency,
  requestSupplement,
  closeReport,
  markUnverified,
  mergeReports,
  splitReportAction,
  createOnBehalf,
  submitVerification,
} from '../store/officerActions';
import { computeKpi } from '../domain/kpi';
import { getMyReports, hasOwnerAccess } from '../domain/access';
import { haversineMeters } from '../domain/geo';
import { getCurrentVolunteer } from '../lib/volunteer';
import mockData from './mock.json';
import { AppState } from '../store/AppStore';

/**
 * Cầu nối tới AppStore: LocalDataSource đọc và ghi đúng state mà các màn hình đang hiển thị
 * (và được lưu vào localStorage), thay vì giữ một bản sao riêng.
 */
export interface StateBridge {
  get(): AppState;
  set(next: AppState): void;
}

const DEFAULT_NOW = '2026-11-24T09:00:00+07:00';

function findReport(state: AppState, id: string): Report {
  const report = state.reports.find((r) => r.id === id);
  if (!report) throw new Error('Không tìm thấy phản ánh');
  return report;
}

function volunteerName(assignee: VolunteerOption | string | null | undefined): string | null {
  if (!assignee) return null;
  return typeof assignee === 'string' ? assignee : assignee.name;
}

export class LocalDataSource implements DataSource {
  private internal: AppState;
  private bridge?: StateBridge;

  constructor(initialReports?: Report[], initialTasks?: VolunteerTask[], bridge?: StateBridge) {
    this.bridge = bridge;
    this.internal = {
      reports: initialReports ? [...initialReports] : [...(mockData.reports as Report[])],
      volunteerTasks: initialTasks
        ? [...initialTasks]
        : [...(mockData.volunteerTasks as VolunteerTask[])],
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: DEFAULT_NOW,
        deviceReports: [],
        anonymousLog: [],
      },
      draft: { photos: [] },
    };
  }

  private read(): AppState {
    return this.bridge ? this.bridge.get() : this.internal;
  }

  private write(next: AppState) {
    if (this.bridge) this.bridge.set(next);
    else this.internal = next;
  }

  private get now(): string {
    return this.read().settings.demoNow || DEFAULT_NOW;
  }

  async getReports(params?: ReportQueryParams): Promise<Report[]> {
    let result = [...this.read().reports].filter((r) => r.status !== 'da_gop');

    if (params?.category) {
      result = result.filter((r) => r.category === params.category);
    }
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }
    if (params?.lat != null && params?.lng != null && params?.radiusMeters != null) {
      const { lat, lng, radiusMeters } = params;
      result = result.filter((r) => haversineMeters(lat, lng, r.lat, r.lng) <= radiusMeters);
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (params?.offset || params?.limit) {
      const offset = params.offset || 0;
      const limit = params.limit || result.length;
      result = result.slice(offset, offset + limit);
    }

    return result;
  }

  async getReportById(idOrCode: string): Promise<Report | null> {
    const found = this.read().reports.find(
      (r) => r.id === idOrCode || (r as unknown as { uuid?: string }).uuid === idOrCode
    );
    return found ? { ...found } : null;
  }

  async getPublicKpi(): Promise<PublicKpiResult> {
    const kpi = computeKpi(this.read().reports, '2026-11', this.now);
    return {
      totalReports: kpi.total,
      resolvedCount: kpi.resolved,
      overdueCount: kpi.overdue,
      avgResolutionDays: kpi.avgDays ?? 0,
    };
  }

  async createReport(payload: SubmitReportPayload): Promise<CreateReportResult> {
    // Spec v3.0 D1 / AC-DATA-6: chế độ local áp cùng quy tắc với API, không có hồ sơ ẩn danh mới.
    if (!payload.phone || payload.anonymous) {
      throw new Error('Vui lòng đăng nhập số điện thoại để gửi phản ánh');
    }
    const { state, report } = submitReport(this.read(), payload, this.now);
    this.write(state);
    return {
      report,
      secretCode: report.secretCode,
      ownerToken: 'local-owner-token-' + report.id,
    };
  }

  async lookupReport(code: string, secretCode: string): Promise<Report> {
    const report = lookupReport(this.read().reports, code, secretCode);
    if (!report) {
      throw new Error('Mã phản ánh hoặc mã bí mật không chính xác.');
    }
    return { ...report };
  }

  async claimReport(reportId: string, phone: string): Promise<Report> {
    this.write(subscribeLater(this.read(), reportId, phone, this.now));
    return findReport(this.read(), reportId);
  }

  async getMyNotifications(): Promise<Notification[] | null> {
    const state = this.read();
    return state.settings.phone
      ? state.notifications.filter((n) => n.phone === state.settings.phone)
      : null;
  }

  async getMyReports(): Promise<Report[]> {
    const state = this.read();
    return getMyReports(state.reports, {
      phone: state.settings.phone,
      deviceReports: state.settings.deviceReports,
    });
  }

  async isReportOwner(reportId: string): Promise<boolean> {
    const state = this.read();
    const report = state.reports.find((r) => r.id === reportId);
    if (!report) return false;
    return hasOwnerAccess(report, {
      phone: state.settings.phone,
      deviceReports: state.settings.deviceReports,
    });
  }

  async unsubscribeReport(reportId: string, phone: string): Promise<Report> {
    this.write(unsubscribe(this.read(), reportId, phone));
    return findReport(this.read(), reportId);
  }

  async claimReportByKey(reportId: string, secretCode: string): Promise<Report> {
    this.write(claimByLink(this.read(), reportId, secretCode));
    return findReport(this.read(), reportId);
  }

  async supplementReport(reportId: string, note: string, photos?: string[]): Promise<Report> {
    this.write(supplementReport(this.read(), reportId, { note, photos: photos || [] }, this.now));
    return findReport(this.read(), reportId);
  }

  async submitFeedback(
    reportId: string,
    feedback: {
      resolved: boolean;
      rating?: number;
      tags?: string[];
      comment?: string;
    }
  ): Promise<Report> {
    this.write(
      submitFeedback(
        this.read(),
        reportId,
        {
          resolved: feedback.resolved,
          rating: feedback.rating || 5,
          tags: feedback.tags || [],
          comment: feedback.comment,
        },
        this.now
      )
    );
    return findReport(this.read(), reportId);
  }

  async followReport(reportId: string, phone?: string): Promise<FollowResult> {
    if (!phone) {
      throw new Error('Vui lòng đăng nhập số điện thoại để báo bạn cũng gặp vấn đề này');
    }
    const report = findReport(this.read(), reportId);
    if (report.reporterPhone === phone) throw new Error('Bạn là người gửi phản ánh này');
    if (report.followers.includes(phone)) return { alreadyFollowed: true };
    this.write(followReport(this.read(), reportId, { phone }));
    return { alreadyFollowed: false };
  }

  async getVolunteerTasks(params?: VolunteerTaskQueryParams): Promise<VolunteerTask[]> {
    let result = [...this.read().volunteerTasks];
    if (params?.status) {
      result = result.filter((t) => t.status === params.status);
    }
    return result;
  }

  async getVolunteerTaskById(taskId: string): Promise<VolunteerTask | null> {
    const task = this.read().volunteerTasks.find((t) => t.id === taskId);
    return task ? { ...task } : null;
  }

  async claimVolunteerTask(taskId: string): Promise<VolunteerTask> {
    const state = this.read();
    const task = state.volunteerTasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Không tìm thấy nhiệm vụ');
    const updated: VolunteerTask = {
      ...task,
      assignee: task.assignee ?? (getCurrentVolunteer() || null),
      status: 'dang_lam',
    };
    this.write({
      ...state,
      volunteerTasks: state.volunteerTasks.map((t) => (t.id === taskId ? updated : t)),
    });
    return updated;
  }

  async submitVolunteerTask(taskId: string, input: VerificationInput): Promise<VolunteerTask> {
    let state = this.read();
    const task = state.volunteerTasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Không tìm thấy nhiệm vụ');
    if (!task.assignee) {
      // Nhiệm vụ mở: người gửi kết quả trở thành người nhận việc.
      state = {
        ...state,
        volunteerTasks: state.volunteerTasks.map((t) =>
          t.id === taskId ? { ...t, assignee: getCurrentVolunteer() || null } : t
        ),
      };
    }
    this.write(submitVerification(state, taskId, input, this.now));
    const updated = this.read().volunteerTasks.find((t) => t.id === taskId);
    if (!updated) throw new Error('Không tìm thấy nhiệm vụ');
    return updated;
  }

  async getOfficerReports(params?: OfficerReportQueryParams): Promise<Report[]> {
    let result = [...this.read().reports];
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    if (params?.department) {
      result = result.filter((r) => r.department === params.department);
    }
    return result;
  }

  async getOfficerReport(idOrCode: string): Promise<Report | null> {
    return this.getReportById(idOrCode);
  }

  async listVolunteers(): Promise<VolunteerOption[]> {
    return VOLUNTEERS.map((name) => ({ id: name, name }));
  }

  async officerUpdateReport(
    reportId: string,
    params: {
      category?: Category;
      priority?: Priority;
      department?: string;
      dueAt?: string;
      version?: number;
    }
  ): Promise<Report> {
    const state = this.read();
    const existing = findReport(state, reportId);
    const updated: Report = {
      ...existing,
      ...(params.category !== undefined ? { category: params.category } : {}),
      ...(params.priority !== undefined ? { priority: params.priority } : {}),
      ...(params.department !== undefined ? { department: params.department } : {}),
      ...(params.dueAt !== undefined ? { dueAt: params.dueAt } : {}),
    };
    this.write({
      ...state,
      reports: state.reports.map((r) => (r.id === reportId ? updated : r)),
    });
    return findReport(this.read(), reportId);
  }

  async officerAcceptReport(
    reportId: string,
    params?: {
      department?: string;
      dueAt?: string;
      category?: Category;
      note?: string;
    }
  ): Promise<Report> {
    this.write(acceptReport(this.read(), reportId, params, this.now));
    return findReport(this.read(), reportId);
  }

  async officerAssignVolunteer(
    reportId: string,
    params: {
      taskType: 'xac_minh' | 'nghiem_thu';
      assignee?: VolunteerOption | string | null;
      note?: string;
    }
  ): Promise<Report> {
    this.write(
      assignVolunteer(
        this.read(),
        reportId,
        { assignee: volunteerName(params.assignee), note: params.note },
        this.now
      )
    );
    return findReport(this.read(), reportId);
  }

  async officerAssignDepartment(
    reportId: string,
    params: {
      department: string;
      dueAt?: string;
      note?: string;
    }
  ): Promise<Report> {
    this.write(
      assignDepartment(
        this.read(),
        reportId,
        { department: params.department, dueAt: params.dueAt, note: params.note },
        this.now
      )
    );
    return findReport(this.read(), reportId);
  }

  async officerCompleteReport(
    reportId: string,
    params: {
      resultNote: string;
      resultPhotos: string[];
      completedAt?: string;
    }
  ): Promise<Report> {
    this.write(
      completeReport(
        this.read(),
        reportId,
        {
          resultNote: params.resultNote,
          resultPhotos: params.resultPhotos,
          completedAt: params.completedAt,
        },
        this.now
      )
    );
    return findReport(this.read(), reportId);
  }

  async officerRequestSupplement(reportId: string, params: { reason: string }): Promise<Report> {
    this.write(requestSupplement(this.read(), reportId, { reason: params.reason }, this.now));
    return findReport(this.read(), reportId);
  }

  async officerTransferAgency(
    reportId: string,
    params: { agency: string; reason: string }
  ): Promise<Report> {
    this.write(
      transferAgency(
        this.read(),
        reportId,
        { agency: params.agency, reason: params.reason },
        this.now
      )
    );
    return findReport(this.read(), reportId);
  }

  async officerMarkUnverified(reportId: string, params?: { reason?: string }): Promise<Report> {
    this.write(markUnverified(this.read(), reportId, { reason: params?.reason }, this.now));
    return findReport(this.read(), reportId);
  }

  async officerCloseReport(reportId: string, params?: { reason?: string }): Promise<Report> {
    this.write(closeReport(this.read(), reportId, { reason: params?.reason }, this.now));
    return findReport(this.read(), reportId);
  }

  async officerMergeReport(reportId: string, targetId: string): Promise<Report> {
    this.write(
      mergeReports(this.read(), targetId, [reportId], { note: 'Gộp phản ánh trùng lặp' }, this.now)
    );
    return findReport(this.read(), targetId);
  }

  async officerSplitReport(mainId: string, childId: string): Promise<Report> {
    this.write(splitReportAction(this.read(), mainId, childId, undefined, this.now));
    return findReport(this.read(), mainId);
  }

  async officerCreateOnBehalf(input: CreateOnBehalfInput): Promise<CreateOnBehalfResult> {
    const result = createOnBehalf(
      this.read(),
      {
        phone: input.phone,
        category: input.category,
        photos: input.photos,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        description: input.description,
        locationNote: input.locationNote,
      },
      this.now
    );
    this.write(result.state);
    return { report: result.report, secretCode: result.report.secretCode };
  }

  async uploadPhoto(file: Blob | File): Promise<string> {
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      return URL.createObjectURL(file);
    }
    return '/demo-photos/placeholder.jpg';
  }

  async suggestCategory(image: string): Promise<AiSuggestionData> {
    const match = image.match(/\/demo-photos\/([a-z_]+)\//);
    if (match && match[1] && (CATEGORIES as readonly string[]).includes(match[1])) {
      const cat = match[1] as Category;
      const reasons: Record<Category, string> = {
        den_duong: 'Phát hiện bóng đèn chiếu sáng hoặc trụ đèn công cộng',
        ngap_nuoc: 'Phát hiện vũng nước ngập diện rộng trên bề mặt đường',
        rac_thai: 'Phát hiện rác thải sinh hoạt tập kết bừa bãi',
        mat_duong: 'Phát hiện ổ gà hoặc nứt vỡ sụt lún mặt đường',
      };
      return {
        category: cat,
        confidence: 0.92,
        provider: 'mock',
        reason: reasons[cat] || 'Gợi ý từ ảnh',
      };
    }
    if (image.includes('unrecognized') || image.includes('khong_ro')) {
      return {
        category: null,
        confidence: 0.2,
        provider: 'mock',
        reason: 'Không nhận diện được loại sự cố đô thị rõ ràng',
      };
    }
    return {
      category: 'mat_duong',
      confidence: 0.88,
      provider: 'mock',
      reason: 'Gợi ý mô phỏng từ ảnh chụp mặt đường',
    };
  }
}
