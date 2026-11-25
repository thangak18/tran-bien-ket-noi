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
  Category,
  Notification,
  Priority,
  Report,
  Status,
  VolunteerTask,
} from '../domain/types';
import { SubmitReportPayload } from '../store/citizenActions';
import {
  ApiError,
  apiFetch,
  citizenAuthHeaders,
  reportKeyHeaders,
  saveReportKey,
  uploadPhotoWithSign,
} from '../lib/api';

type Json = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** Ảnh từ API có thể là chuỗi hoặc { kind, url } (chi tiết cũ); luôn trả về mảng chuỗi. */
function photoList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === 'string') out.push(item);
    else if (item && typeof item === 'object' && typeof (item as Json).url === 'string') {
      out.push((item as Json).url as string);
    }
  }
  return out;
}

/**
 * Chuẩn hoá phản hồi của server về kiểu Report của giao diện.
 * Server không bao giờ trả secretCode hay danh sách SĐT người theo dõi nên các trường đó luôn rỗng.
 */
export function mapApiReport(raw: Json): Report {
  const timeline = Array.isArray(raw.timeline) ? (raw.timeline as Json[]) : [];
  return {
    id: String(raw.id ?? raw.code),
    category: raw.category as Category,
    photos: photoList(raw.photos),
    photosApproved: raw.photosApproved === undefined ? true : Boolean(raw.photosApproved),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    address: String(raw.address ?? ''),
    locationNote: str(raw.locationNote),
    title: str(raw.title),
    description: str(raw.description),
    createdAt: String(raw.createdAt ?? ''),
    status: raw.status as Status,
    statusBeforeMerge: str(raw.statusBeforeMerge) as Status | undefined,
    priority: raw.priority === 'cao' ? 'cao' : 'binh_thuong',
    department: str(raw.department) ?? str(raw.departmentName),
    dueAt: str(raw.dueAt),
    reporterPhone: str(raw.reporterPhone),
    anonymous: Boolean(raw.anonymous),
    subscribedLater: Boolean(raw.subscribedLater),
    secretCode: '',
    onBehalf: Boolean(raw.onBehalf),
    followers: [],
    anonymousFollows: 0,
    followerCount: typeof raw.followerCount === 'number' ? raw.followerCount : 0,
    mergedInto: str(raw.mergedInto),
    mergedChildren: Array.isArray(raw.mergedChildren)
      ? (raw.mergedChildren as string[])
      : undefined,
    resultPhotos: photoList(raw.resultPhotos),
    resultNote: str(raw.resultNote),
    completedAt: str(raw.completedAt),
    feedback: raw.feedback ? (raw.feedback as Report['feedback']) : undefined,
    timeline: timeline.map((t) => ({
      at: String(t.at),
      status: t.status as Status,
      actor: String(t.actor ?? 'Phường Trấn Biên'),
      note: str(t.note),
    })),
    version: typeof raw.version === 'number' ? raw.version : undefined,
    aiSuggestion: raw.aiSuggestion
      ? (raw.aiSuggestion as Report['aiSuggestion'])
      : raw.ai_suggestion
        ? (raw.ai_suggestion as Report['aiSuggestion'])
        : null,
  };
}

export function mapApiTask(raw: Json): VolunteerTask {
  const result = raw.result as Json | undefined;
  return {
    id: String(raw.id),
    reportId: String(raw.reportId),
    type: raw.type as VolunteerTask['type'],
    assignee: str(raw.assignee) ?? str(raw.assigneeName) ?? null,
    status: raw.status as VolunteerTask['status'],
    result: result
      ? {
          exists: result.exists as 'co' | 'khong' | 'khong_tim_thay',
          severity: str(result.severity) as 'nhe' | 'trung_binh' | 'nguy_hiem' | undefined,
          photo: String(result.photo ?? ''),
          note: str(result.note),
          at: String(result.at ?? ''),
        }
      : undefined,
    reporterPhone: str(raw.reporterPhone),
  };
}

const enc = encodeURIComponent;

export class ApiDataSource implements DataSource {
  private async postOfficer(reportId: string, action: string, body: Json): Promise<Report> {
    await apiFetch(`/officer/reports/${enc(reportId)}/${action}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.requireOfficerReport(reportId);
  }

  private async requireOfficerReport(reportId: string): Promise<Report> {
    const report = await this.getOfficerReport(reportId);
    if (!report) throw new ApiError('NOT_FOUND', 'Không tìm thấy dữ liệu yêu cầu.', 404);
    return report;
  }

  private async requireReport(reportId: string): Promise<Report> {
    const report = await this.getReportById(reportId);
    if (!report) throw new ApiError('NOT_FOUND', 'Không tìm thấy dữ liệu yêu cầu.', 404);
    return report;
  }

  async getReports(params?: ReportQueryParams): Promise<Report[]> {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.status) sp.set('status', params.status);
    if (params?.lat != null) sp.set('lat', String(params.lat));
    if (params?.lng != null) sp.set('lng', String(params.lng));
    if (params?.radiusMeters != null) sp.set('radius', String(params.radiusMeters));
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.offset != null) sp.set('offset', String(params.offset));

    const qs = sp.toString();
    const res = await apiFetch<{ items?: Json[] }>(`/public/reports${qs ? `?${qs}` : ''}`);
    let reports = (res.items ?? []).map(mapApiReport).filter((r) => r.status !== 'da_gop');
    if (params?.search) {
      const q = params.search.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return reports;
  }

  async getReportById(idOrCode: string): Promise<Report | null> {
    try {
      return mapApiReport(await apiFetch<Json>(`/public/reports/${enc(idOrCode)}`));
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 404) return null;
      throw err;
    }
  }

  async getPublicKpi(): Promise<PublicKpiResult> {
    const res = await apiFetch<Json>('/public/kpi');
    return {
      totalReports: Number(res.total ?? 0),
      resolvedCount: Number(res.resolved ?? 0),
      overdueCount: Number(res.overdue ?? 0),
      avgResolutionDays: Number(res.avgResolutionDays ?? 0),
    };
  }

  async createReport(
    payload: SubmitReportPayload,
    options?: { idempotencyKey?: string }
  ): Promise<CreateReportResult> {
    const headers: Record<string, string> = { ...citizenAuthHeaders() };
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    // Tải ảnh dạng data URL lên Supabase Storage (bucket report-photos) qua signed URL trước khi tạo hồ sơ.
    const uploadedPhotos: string[] = [];
    for (let i = 0; i < (payload.photos ?? []).length; i++) {
      const p = payload.photos[i]!;
      if (p.startsWith('data:image/')) {
        try {
          const blob = await fetch(p).then((r) => r.blob());
          const ext =
            blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
          const path = await this.uploadPhoto(blob, `photo-${i + 1}.${ext}`);
          uploadedPhotos.push(path);
        } catch {
          uploadedPhotos.push(p);
        }
      } else {
        uploadedPhotos.push(p);
      }
    }

    const res = await apiFetch<{ code: string; secretCode?: string; ownerToken?: string }>(
      '/citizen/reports',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, photos: uploadedPhotos }),
      }
    );
    if (res.ownerToken) saveReportKey(res.code, res.ownerToken);
    return {
      report: await this.requireReport(res.code),
      secretCode: res.secretCode,
      ownerToken: res.ownerToken,
    };
  }

  async lookupReport(code: string, secretCode: string): Promise<Report> {
    const res = await apiFetch<{ code: string; ownerToken?: string }>(
      `/citizen/reports/lookup?code=${enc(code)}&secretCode=${enc(secretCode)}`
    );
    if (res.ownerToken) saveReportKey(res.code, res.ownerToken);
    return this.requireReport(res.code);
  }

  async claimReport(reportId: string, phone: string): Promise<Report> {
    await apiFetch(`/citizen/reports/${enc(reportId)}/subscribe`, {
      method: 'POST',
      headers: { ...citizenAuthHeaders(), ...reportKeyHeaders(reportId) },
      body: JSON.stringify({ phone }),
    });
    return this.requireReport(reportId);
  }

  async getMyNotifications(): Promise<Notification[] | null> {
    if (Object.keys(citizenAuthHeaders()).length === 0) return null;
    const res = await apiFetch<{ items?: Json[] }>('/citizen/me/notifications', {
      headers: citizenAuthHeaders(),
    });
    return (res.items ?? []).map((n) => ({
      id: String(n.id),
      phone: String(n.phone ?? ''),
      reportId: String(n.report_code ?? n.report_id ?? ''),
      message: String(n.message ?? ''),
      createdAt: String(n.created_at ?? ''),
      read: Boolean(n.read),
      channel: n.channel === 'sms_mo_phong' ? 'sms_mo_phong' : 'app',
    }));
  }

  async getMyReports(): Promise<Report[]> {
    // Cần token người dân (sau OTP). Chưa đăng nhập thì không có hồ sơ nào gắn SĐT.
    if (Object.keys(citizenAuthHeaders()).length === 0) return [];
    const res = await apiFetch<{ items?: Json[] }>('/citizen/me/reports', {
      headers: citizenAuthHeaders(),
    });
    return (res.items ?? []).map(mapApiReport);
  }

  async isReportOwner(reportId: string): Promise<boolean> {
    try {
      await apiFetch(`/citizen/reports/${enc(reportId)}/owner`, {
        headers: { ...citizenAuthHeaders(), ...reportKeyHeaders(reportId) },
      });
      return true;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 403 || status === 401 || status === 404) return false;
      throw err;
    }
  }

  async unsubscribeReport(reportId: string, phone: string): Promise<Report> {
    await apiFetch(`/citizen/reports/${enc(reportId)}/subscribe?phone=${enc(phone)}`, {
      method: 'DELETE',
      headers: { ...citizenAuthHeaders(), ...reportKeyHeaders(reportId) },
    });
    return this.requireReport(reportId);
  }

  async claimReportByKey(reportId: string, secretCode: string): Promise<Report> {
    const res = await apiFetch<{ code: string; ownerToken?: string }>(
      `/citizen/reports/${enc(reportId)}/claim`,
      {
        method: 'POST',
        headers: citizenAuthHeaders(),
        body: JSON.stringify({ secretCode }),
      }
    );
    if (res.ownerToken) saveReportKey(res.code, res.ownerToken);
    return this.requireReport(res.code);
  }

  async supplementReport(reportId: string, note: string): Promise<Report> {
    await apiFetch(`/citizen/reports/${enc(reportId)}/supplement`, {
      method: 'POST',
      headers: { ...citizenAuthHeaders(), ...reportKeyHeaders(reportId) },
      body: JSON.stringify({ note }),
    });
    return this.requireReport(reportId);
  }

  async submitFeedback(
    reportId: string,
    feedback: { resolved: boolean; rating?: number; tags?: string[]; comment?: string }
  ): Promise<Report> {
    await apiFetch(`/citizen/reports/${enc(reportId)}/feedback`, {
      method: 'POST',
      headers: { ...citizenAuthHeaders(), ...reportKeyHeaders(reportId) },
      body: JSON.stringify(feedback),
    });
    return this.requireReport(reportId);
  }

  async followReport(reportId: string): Promise<FollowResult> {
    // SĐT lấy từ token người dân ở server; không gửi SĐT trong body.
    const res = await apiFetch<{ alreadyFollowed?: boolean }>(
      `/citizen/reports/${enc(reportId)}/follow`,
      { method: 'POST', headers: citizenAuthHeaders(), body: JSON.stringify({}) }
    );
    return { alreadyFollowed: Boolean(res.alreadyFollowed) };
  }

  async getVolunteerTasks(params?: VolunteerTaskQueryParams): Promise<VolunteerTask[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.lat != null) sp.set('lat', String(params.lat));
    if (params?.lng != null) sp.set('lng', String(params.lng));
    if (params?.radiusMeters != null) sp.set('radius', String(params.radiusMeters));

    const qs = sp.toString();
    const res = await apiFetch<{ items?: Json[] }>(`/volunteer/tasks${qs ? `?${qs}` : ''}`);
    return (res.items ?? []).map(mapApiTask);
  }

  async getVolunteerTaskById(taskId: string): Promise<VolunteerTask | null> {
    try {
      return mapApiTask(await apiFetch<Json>(`/volunteer/tasks/${enc(taskId)}`));
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 404) return null;
      throw err;
    }
  }

  private async requireTask(taskId: string): Promise<VolunteerTask> {
    const task = await this.getVolunteerTaskById(taskId);
    if (!task) throw new ApiError('NOT_FOUND', 'Không tìm thấy nhiệm vụ.', 404);
    return task;
  }

  async claimVolunteerTask(taskId: string): Promise<VolunteerTask> {
    await apiFetch(`/volunteer/tasks/${enc(taskId)}/claim`, { method: 'POST' });
    return this.requireTask(taskId);
  }

  async submitVolunteerTask(taskId: string, input: VerificationInput): Promise<VolunteerTask> {
    await apiFetch(`/volunteer/tasks/${enc(taskId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        exists: input.exists,
        severity: input.exists === 'co' ? input.severity : undefined,
        photoPath: input.photo,
        note: input.note,
      }),
    });
    return this.requireTask(taskId);
  }

  async getOfficerReports(params?: OfficerReportQueryParams): Promise<Report[]> {
    const sp = new URLSearchParams({ limit: '200' });
    if (params?.status) sp.set('status', params.status);
    if (params?.overdueOnly) sp.set('isOverdue', 'true');
    const res = await apiFetch<{ items?: Json[] }>(`/officer/reports?${sp.toString()}`);
    let reports = (res.items ?? []).map(mapApiReport);
    if (params?.department) reports = reports.filter((r) => r.department === params.department);
    return reports;
  }

  async getOfficerReport(idOrCode: string): Promise<Report | null> {
    try {
      return mapApiReport(await apiFetch<Json>(`/officer/reports/${enc(idOrCode)}`));
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 404) return null;
      throw err;
    }
  }

  async listVolunteers(): Promise<VolunteerOption[]> {
    const res = await apiFetch<{ items?: VolunteerOption[] }>('/officer/volunteers');
    return (res.items ?? []).map((v) => ({ id: v.id, name: v.name }));
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
    await apiFetch(`/officer/reports/${enc(reportId)}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return this.requireOfficerReport(reportId);
  }

  officerAcceptReport(
    reportId: string,
    params?: {
      department?: string;
      dueAt?: string;
      category?: Category;
      note?: string;
      version?: number;
    }
  ): Promise<Report> {
    return this.postOfficer(reportId, 'accept', { ...(params ?? {}) });
  }

  officerAssignVolunteer(
    reportId: string,
    params: {
      taskType: 'xac_minh' | 'nghiem_thu';
      assignee?: VolunteerOption | string | null;
      note?: string;
      version?: number;
    }
  ): Promise<Report> {
    const assignee = params.assignee;
    return this.postOfficer(reportId, 'assign-volunteer', {
      type: params.taskType,
      assigneeId: assignee && typeof assignee === 'object' ? assignee.id : undefined,
      assignee: typeof assignee === 'string' && assignee ? assignee : undefined,
      note: params.note,
      version: params.version,
    });
  }

  officerAssignDepartment(
    reportId: string,
    params: { department: string; dueAt?: string; note?: string; version?: number }
  ): Promise<Report> {
    return this.postOfficer(reportId, 'assign-dept', { ...params });
  }

  officerCompleteReport(
    reportId: string,
    params: { resultNote: string; resultPhotos: string[]; completedAt?: string; version?: number }
  ): Promise<Report> {
    // Ngày hoàn thành do máy chủ ghi nhận; completedAt chỉ dùng cho chế độ mô phỏng.
    const { completedAt: _ignored, ...body } = params;
    void _ignored;
    return this.postOfficer(reportId, 'complete', body);
  }

  officerRequestSupplement(
    reportId: string,
    params: { reason: string; version?: number }
  ): Promise<Report> {
    return this.postOfficer(reportId, 'request-supplement', { ...params });
  }

  officerTransferAgency(
    reportId: string,
    params: { agency: string; reason: string; version?: number }
  ): Promise<Report> {
    return this.postOfficer(reportId, 'transfer', {
      targetAgency: params.agency,
      reason: params.reason,
      version: params.version,
    });
  }

  officerMarkUnverified(
    reportId: string,
    params?: { reason?: string; version?: number }
  ): Promise<Report> {
    return this.postOfficer(reportId, 'mark-unverified', { ...(params ?? {}) });
  }

  officerCloseReport(
    reportId: string,
    params?: { reason?: string; version?: number }
  ): Promise<Report> {
    return this.postOfficer(reportId, 'close', { ...(params ?? {}) });
  }

  async officerMergeReport(
    reportId: string,
    targetId: string,
    params?: { version?: number }
  ): Promise<Report> {
    await apiFetch(`/officer/reports/${enc(reportId)}/merge`, {
      method: 'POST',
      body: JSON.stringify({ targetReportId: targetId, version: params?.version }),
    });
    // Trả về hồ sơ chính để màn hình cập nhật danh sách "Đã gộp".
    return this.requireOfficerReport(targetId);
  }

  async officerSplitReport(
    mainId: string,
    childId: string,
    params?: { version?: number }
  ): Promise<Report> {
    await apiFetch(`/officer/reports/${enc(childId)}/split`, {
      method: 'POST',
      body: JSON.stringify({ version: params?.version }),
    });
    return this.requireOfficerReport(mainId);
  }

  async officerCreateOnBehalf(input: CreateOnBehalfInput): Promise<CreateOnBehalfResult> {
    const res = await apiFetch<{ report: { code: string }; secretCode: string }>(
      '/officer/reports',
      {
        method: 'POST',
        body: JSON.stringify({
          category: input.category,
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          description: input.description,
          locationNote: input.locationNote,
          reporterPhone: input.phone,
          photos: input.photos,
        }),
      }
    );
    return { report: await this.requireOfficerReport(res.report.code), secretCode: res.secretCode };
  }

  async uploadPhoto(file: Blob | File, filename?: string): Promise<string> {
    return uploadPhotoWithSign(file, filename);
  }

  async suggestCategory(image: string): Promise<AiSuggestionData> {
    return apiFetch<AiSuggestionData>('/ai/suggest-category', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });
  }
}
