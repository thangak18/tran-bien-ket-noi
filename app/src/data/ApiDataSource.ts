import {
  DataSource,
  PublicKpiResult,
  ReportQueryParams,
  VolunteerTaskQueryParams,
  OfficerReportQueryParams,
  CreateReportResult,
} from './DataSource';
import { Category, Report, VolunteerTask } from '../domain/types';
import { SubmitReportPayload } from '../store/citizenActions';
import { apiFetch, uploadPhotoWithSign } from '../lib/api';

export class ApiDataSource implements DataSource {
  async getReports(params?: ReportQueryParams): Promise<Report[]> {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    if (params?.lat != null) sp.set('lat', String(params.lat));
    if (params?.lng != null) sp.set('lng', String(params.lng));
    if (params?.radiusMeters != null) sp.set('radiusMeters', String(params.radiusMeters));
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.offset != null) sp.set('offset', String(params.offset));

    const qs = sp.toString();
    const endpoint = `/public/reports${qs ? `?${qs}` : ''}`;
    const res = await apiFetch<{ reports: Report[] }>(endpoint);
    return res.reports;
  }

  async getReportById(idOrCode: string): Promise<Report | null> {
    try {
      const res = await apiFetch<Report>(`/public/reports/${idOrCode}`);
      return res;
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async getPublicKpi(): Promise<PublicKpiResult> {
    const res = await apiFetch<PublicKpiResult>('/public/kpi');
    return res;
  }

  async createReport(
    payload: SubmitReportPayload,
    options?: { idempotencyKey?: string }
  ): Promise<CreateReportResult> {
    const headers: Record<string, string> = {};
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const res = await apiFetch<{
      code: string;
      secretCode: string;
      ownerToken: string;
      report: Report;
    }>('/citizen/reports', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return {
      report: res.report || ({ ...payload, id: res.code } as unknown as Report),
      secretCode: res.secretCode,
      ownerToken: res.ownerToken,
    };
  }

  async lookupReport(code: string, secretCode: string): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(
      `/citizen/reports/lookup?code=${encodeURIComponent(code)}&secretCode=${encodeURIComponent(secretCode)}`
    );
    return res.report;
  }

  async claimReport(reportId: string, phone: string): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(`/citizen/reports/${reportId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return res.report;
  }

  async supplementReport(reportId: string, note: string, photos?: string[]): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(`/citizen/reports/${reportId}/supplement`, {
      method: 'POST',
      body: JSON.stringify({ note, photos }),
    });
    return res.report;
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
    const res = await apiFetch<{ report: Report }>(`/citizen/reports/${reportId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
    return res.report;
  }

  async followReport(reportId: string, phone?: string): Promise<void> {
    await apiFetch(`/citizen/reports/${reportId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async getVolunteerTasks(params?: VolunteerTaskQueryParams): Promise<VolunteerTask[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.lat != null) sp.set('lat', String(params.lat));
    if (params?.lng != null) sp.set('lng', String(params.lng));
    if (params?.radiusMeters != null) sp.set('radiusMeters', String(params.radiusMeters));

    const qs = sp.toString();
    const res = await apiFetch<{ tasks: VolunteerTask[] }>(`/volunteer/tasks${qs ? `?${qs}` : ''}`);
    return res.tasks;
  }

  async getVolunteerTaskById(taskId: string): Promise<VolunteerTask | null> {
    try {
      const res = await apiFetch<VolunteerTask>(`/volunteer/tasks/${taskId}`);
      return res;
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 404) return null;
      throw err;
    }
  }

  async claimVolunteerTask(taskId: string): Promise<VolunteerTask> {
    const res = await apiFetch<{ task: VolunteerTask }>(`/volunteer/tasks/${taskId}/claim`, {
      method: 'POST',
    });
    return res.task;
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
    const res = await apiFetch<{ task: VolunteerTask }>(`/volunteer/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.task;
  }

  async getOfficerReports(params?: OfficerReportQueryParams): Promise<Report[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.department) sp.set('department', params.department);
    if (params?.overdueOnly) sp.set('overdueOnly', 'true');

    const qs = sp.toString();
    const res = await apiFetch<{ reports: Report[] }>(`/officer/reports${qs ? `?${qs}` : ''}`);
    return res.reports;
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
    const res = await apiFetch<{ report: Report }>(`/officer/reports/${reportId}/accept`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
    return res.report;
  }

  async officerAssignVolunteer(
    reportId: string,
    params: {
      taskType: 'xac_minh' | 'nghiem_thu';
      assignee: string;
      note?: string;
    }
  ): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(
      `/officer/reports/${reportId}/assign-volunteer`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
    return res.report;
  }

  async officerAssignDepartment(
    reportId: string,
    params: {
      department: string;
      dueAt?: string;
      note?: string;
    }
  ): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(`/officer/reports/${reportId}/assign-dept`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.report;
  }

  async officerCompleteReport(
    reportId: string,
    params: {
      resultNote: string;
      resultPhotos: string[];
    }
  ): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(`/officer/reports/${reportId}/complete`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.report;
  }

  async officerRejectReport(
    reportId: string,
    params: {
      reason: string;
      mode?: 'tu_choi' | 'chuyen_co_quan';
    }
  ): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(`/officer/reports/${reportId}/reject`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.report;
  }

  async officerMergeReport(reportId: string, targetId: string): Promise<Report> {
    const res = await apiFetch<{ report: Report }>(`/officer/reports/${reportId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
    return res.report;
  }

  async uploadPhoto(file: Blob | File, filename?: string): Promise<string> {
    return uploadPhotoWithSign(file, filename);
  }
}
