import {
  DataSource,
  PublicKpiResult,
  ReportQueryParams,
  VolunteerTaskQueryParams,
  OfficerReportQueryParams,
  CreateReportResult,
} from './DataSource';
import { Category, Report, VolunteerTask } from '../domain/types';
import {
  SubmitReportPayload,
  submitReport,
  lookupReport,
  subscribeLater,
  supplementReport,
  submitFeedback,
  followReport,
} from '../store/citizenActions';
import {
  acceptReport,
  assignVolunteer,
  assignDepartment,
  completeReport,
  transferAgency,
  mergeReports,
  submitVerification,
} from '../store/officerActions';
import { computeKpi } from '../domain/kpi';
import { haversineMeters } from '../domain/geo';
import mockData from './mock.json';
import { AppState } from '../store/AppStore';

export class LocalDataSource implements DataSource {
  private reports: Report[];
  private volunteerTasks: VolunteerTask[];
  private now: string = '2026-11-24T09:00:00+07:00';

  constructor(initialReports?: Report[], initialTasks?: VolunteerTask[]) {
    this.reports = initialReports ? [...initialReports] : [...(mockData.reports as Report[])];
    this.volunteerTasks = initialTasks
      ? [...initialTasks]
      : [...(mockData.volunteerTasks as VolunteerTask[])];
  }

  private getState(): AppState {
    return {
      reports: this.reports,
      volunteerTasks: this.volunteerTasks,
      notifications: [],
      settings: {
        seniorMode: false,
        demoNow: this.now,
        deviceReports: [],
        anonymousLog: [],
      },
      draft: { photos: [] },
    };
  }

  private syncState(state: AppState) {
    this.reports = state.reports;
    this.volunteerTasks = state.volunteerTasks;
  }

  async getReports(params?: ReportQueryParams): Promise<Report[]> {
    let result = [...this.reports].filter((r) => r.status !== 'da_gop');

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
    const found = this.reports.find(
      (r) => r.id === idOrCode || (r as unknown as { uuid?: string }).uuid === idOrCode
    );
    return found ? { ...found } : null;
  }

  async getPublicKpi(): Promise<PublicKpiResult> {
    const kpi = computeKpi(this.reports, '2026-11', this.now);
    return {
      totalReports: kpi.total,
      resolvedCount: kpi.resolved,
      overdueCount: kpi.overdue,
      avgResolutionDays: kpi.avgDays ?? 0,
    };
  }

  async createReport(payload: SubmitReportPayload): Promise<CreateReportResult> {
    const { state, report } = submitReport(this.getState(), payload, this.now);
    this.syncState(state);
    return {
      report,
      secretCode: report.secretCode,
      ownerToken: 'local-owner-token-' + report.id,
    };
  }

  async lookupReport(code: string, secretCode: string): Promise<Report> {
    const report = lookupReport(this.reports, code, secretCode);
    if (!report) {
      throw new Error('Mã phản ánh hoặc mã bí mật không chính xác.');
    }
    return { ...report };
  }

  async claimReport(reportId: string, phone: string): Promise<Report> {
    const nextState = subscribeLater(this.getState(), reportId, phone, this.now);
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async supplementReport(reportId: string, note: string, photos?: string[]): Promise<Report> {
    const nextState = supplementReport(
      this.getState(),
      reportId,
      { note, photos: photos || [] },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
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
    const nextState = submitFeedback(
      this.getState(),
      reportId,
      {
        resolved: feedback.resolved,
        rating: feedback.rating || 5,
        tags: feedback.tags || [],
        comment: feedback.comment,
      },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async followReport(reportId: string, phone?: string): Promise<void> {
    const nextState = followReport(this.getState(), reportId, { phone });
    this.syncState(nextState);
  }

  async getVolunteerTasks(params?: VolunteerTaskQueryParams): Promise<VolunteerTask[]> {
    let result = [...this.volunteerTasks];
    if (params?.status) {
      result = result.filter((t) => t.status === params.status);
    }
    return result;
  }

  async getVolunteerTaskById(taskId: string): Promise<VolunteerTask | null> {
    const task = this.volunteerTasks.find((t) => t.id === taskId);
    return task ? { ...task } : null;
  }

  async claimVolunteerTask(taskId: string): Promise<VolunteerTask> {
    const idx = this.volunteerTasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error('Không tìm thấy nhiệm vụ');
    const updated = { ...this.volunteerTasks[idx]!, status: 'dang_lam' as const };
    this.volunteerTasks[idx] = updated;
    return updated;
  }

  async submitVolunteerTask(
    taskId: string,
    payload: {
      note?: string;
      photos?: string[];
      status?: string;
      verifiedCategory?: string;
    }
  ): Promise<VolunteerTask> {
    const nextState = submitVerification(
      this.getState(),
      taskId,
      {
        exists: 'co',
        severity: 'trung_binh',
        photo: payload.photos?.[0] || '/demo-photos/placeholder.jpg',
        note: payload.note || 'Đã xác minh hiện trường',
      },
      this.now
    );
    this.syncState(nextState);
    const updated = this.volunteerTasks.find((t) => t.id === taskId);
    if (!updated) throw new Error('Không tìm thấy nhiệm vụ');
    return updated;
  }

  async getOfficerReports(params?: OfficerReportQueryParams): Promise<Report[]> {
    let result = [...this.reports];
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    if (params?.department) {
      result = result.filter((r) => r.department === params.department);
    }
    return result;
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
    const nextState = acceptReport(this.getState(), reportId, params, this.now);
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async officerAssignVolunteer(
    reportId: string,
    params: {
      taskType: 'xac_minh' | 'nghiem_thu';
      assignee: string;
      note?: string;
    }
  ): Promise<Report> {
    const nextState = assignVolunteer(
      this.getState(),
      reportId,
      {
        assignee: params.assignee,
        note: params.note,
      },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async officerAssignDepartment(
    reportId: string,
    params: {
      department: string;
      dueAt?: string;
      note?: string;
    }
  ): Promise<Report> {
    const nextState = assignDepartment(
      this.getState(),
      reportId,
      {
        department: params.department,
        dueAt: params.dueAt,
        note: params.note,
      },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async officerCompleteReport(
    reportId: string,
    params: {
      resultNote: string;
      resultPhotos: string[];
    }
  ): Promise<Report> {
    const nextState = completeReport(
      this.getState(),
      reportId,
      {
        resultNote: params.resultNote,
        resultPhotos: params.resultPhotos,
      },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async officerRejectReport(
    reportId: string,
    params: {
      reason: string;
      mode?: 'tu_choi' | 'chuyen_co_quan';
    }
  ): Promise<Report> {
    const nextState = transferAgency(
      this.getState(),
      reportId,
      {
        agency: 'Cơ quan bên ngoài',
        reason: params.reason,
      },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async officerMergeReport(reportId: string, targetId: string): Promise<Report> {
    const nextState = mergeReports(
      this.getState(),
      targetId,
      [reportId],
      { note: 'Gộp phản ánh trùng lặp' },
      this.now
    );
    this.syncState(nextState);
    const updated = this.reports.find((r) => r.id === reportId);
    if (!updated) throw new Error('Không tìm thấy phản ánh');
    return updated;
  }

  async uploadPhoto(file: Blob | File): Promise<string> {
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      return URL.createObjectURL(file);
    }
    return '/demo-photos/placeholder.jpg';
  }
}
