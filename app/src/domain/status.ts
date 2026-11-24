import { Report, Role, Status, Feedback } from './types';
import { publicLabel, progressStep } from './constants';

export { publicLabel, progressStep };

export interface TransitionParams {
  note?: string;
  department?: string;
  dueAt?: string;
  resultPhotos?: string[];
  resultNote?: string;
  targetAgency?: string;
  feedback?: Feedback;
  statusBeforeMerge?: Status;
  mergedInto?: string;
}

/**
 * Kiểm tra xem chuyển trạng thái có hợp lệ theo vai trò hay không (spec 3.3)
 */
export function canTransition(from: Status, to: Status, role: Role): boolean {
  if (role === 'TNV') {
    return false; // TNV không thể chuyển bất kỳ trạng thái nào trực tiếp
  }

  if (role === 'ND') {
    if (from === 'can_bo_sung' && to === 'moi') return true;
    return false;
  }

  if (role === 'system') {
    if (from === 'cho_xac_minh' && to === 'da_tiep_nhan') return true;
    if (from === 'hoan_thanh' && (to === 'dong' || to === 'mo_lai')) return true;
    return false;
  }

  if (role === 'CB') {
    if (to === 'da_gop') {
      return from !== 'dong' && from !== 'da_gop';
    }

    switch (from) {
      case 'moi':
        return ['da_tiep_nhan', 'cho_xac_minh', 'can_bo_sung', 'chuyen_co_quan'].includes(to);
      case 'da_tiep_nhan':
        return ['cho_xac_minh', 'da_giao', 'can_bo_sung', 'chuyen_co_quan'].includes(to);
      case 'cho_xac_minh':
        return to === 'khong_xac_nhan';
      case 'da_giao':
        return to === 'hoan_thanh';
      case 'mo_lai':
        return to === 'da_giao' || to === 'dong';
      case 'can_bo_sung':
      case 'hoan_thanh':
      case 'dong':
      case 'da_gop':
      case 'chuyen_co_quan':
      case 'khong_xac_nhan':
        return false;
    }
  }

  return false;
}

/**
 * Thực hiện chuyển trạng thái (spec 3.3)
 * Trả về report mới cùng cờ notificationNeeded (nếu nhãn công khai thay đổi bước)
 */
export function transition(
  report: Report,
  targetStatus: Status,
  role: Role,
  actor: string,
  now: string,
  params?: TransitionParams
): { report: Report; notificationNeeded: boolean } {
  if (!canTransition(report.status, targetStatus, role)) {
    throw new Error(
      `Không thể chuyển trạng thái từ "${report.status}" sang "${targetStatus}" với vai trò ${role}`
    );
  }

  // Điều kiện bắt buộc theo spec 3.3
  if (targetStatus === 'hoan_thanh') {
    if (!params?.resultPhotos || params.resultPhotos.length === 0) {
      throw new Error('Cần có ít nhất 1 hình ảnh kết quả xử lý');
    }
    if (!params?.resultNote || params.resultNote.trim().length < 10) {
      throw new Error('Mô tả công việc hoàn thành phải có ít nhất 10 ký tự');
    }
  }

  if (targetStatus === 'can_bo_sung') {
    if (!params?.note || params.note.trim().length < 10) {
      throw new Error('Cần nhập lý do yêu cầu bổ sung ít nhất 10 ký tự');
    }
  }

  if (targetStatus === 'chuyen_co_quan') {
    if (!params?.targetAgency || params.targetAgency.trim().length === 0) {
      throw new Error('Cần nhập tên cơ quan tiếp nhận chuyển');
    }
    if (!params?.note || params.note.trim().length < 10) {
      throw new Error('Cần nhập lý do chuyển cơ quan ít nhất 10 ký tự');
    }
  }

  const prevStep = progressStep(report.status);
  const nextStep = progressStep(targetStatus);
  const notificationNeeded = prevStep !== nextStep || targetStatus === 'can_bo_sung';

  const updatedReport: Report = {
    ...report,
    status: targetStatus,
    department: params?.department ?? report.department,
    dueAt: params?.dueAt ?? report.dueAt,
    resultPhotos: params?.resultPhotos ?? report.resultPhotos,
    resultNote: params?.resultNote ?? report.resultNote,
    feedback: params?.feedback ?? report.feedback,
    completedAt: targetStatus === 'hoan_thanh' ? (report.completedAt ?? now) : report.completedAt,
    statusBeforeMerge:
      targetStatus === 'da_gop'
        ? (params?.statusBeforeMerge ?? report.status)
        : report.statusBeforeMerge,
    mergedInto: targetStatus === 'da_gop' ? params?.mergedInto : report.mergedInto,
    timeline: [
      ...report.timeline,
      {
        at: now,
        status: targetStatus,
        actor,
        note: params?.note ?? (params?.resultNote ? `Hoàn thành: ${params.resultNote}` : undefined),
      },
    ],
  };

  return { report: updatedReport, notificationNeeded };
}

// BONUS B2 – HOÃN: chưa dùng trong UI lõi
/**
 * Tách hồ sơ đã gộp, khôi phục trạng thái cũ (spec 3.3, UT-012.6)
 */
export function splitReport(mergedReport: Report, now: string, actor: string): Report {
  if (mergedReport.status !== 'da_gop') {
    throw new Error('Chỉ có thể tách hồ sơ đang ở trạng thái đã gộp');
  }

  const restoredStatus = mergedReport.statusBeforeMerge ?? 'moi';

  return {
    ...mergedReport,
    status: restoredStatus,
    statusBeforeMerge: undefined,
    mergedInto: undefined,
    timeline: [
      ...mergedReport.timeline,
      {
        at: now,
        status: restoredStatus,
        actor,
        note: `Tách khỏi hồ sơ ${mergedReport.mergedInto ?? ''}`,
      },
    ],
  };
}

export interface PublicTimelineStep {
  step: 1 | 2 | 3 | 4;
  label: string;
  status: 'done' | 'current' | 'upcoming';
  at?: string;
  expected?: string;
  department?: string;
  note?: string;
}

/**
 * 4 mốc tiến trình công khai cho người dân (spec 3.2, AC-C06-1, UT-012 mục 8-12)
 */
export function publicTimeline(report: Report): PublicTimelineStep[] {
  let effectiveStatus = report.status;
  if (progressStep(effectiveStatus) === 'exception') {
    const regularEntry = [...report.timeline]
      .reverse()
      .find((t) => progressStep(t.status) !== 'exception');
    effectiveStatus = regularEntry ? regularEntry.status : 'moi';
  }

  const targetStep = progressStep(effectiveStatus) as 1 | 2 | 3 | 4;
  const isDong = report.status === 'dong';
  const isMoLai = report.status === 'mo_lai';

  const tMoi = [...report.timeline].reverse().find((t) => t.status === 'moi');
  const tTiepNhan = [...report.timeline]
    .reverse()
    .find((t) => t.status === 'da_tiep_nhan' || t.status === 'cho_xac_minh');
  const tGiao = [...report.timeline]
    .reverse()
    .find((t) => t.status === 'da_giao' || t.status === 'mo_lai');
  const tHoanThanh = isMoLai
    ? undefined
    : [...report.timeline].reverse().find((t) => t.status === 'hoan_thanh') ||
      [...report.timeline].reverse().find((t) => t.status === 'dong');

  const step1At = tMoi?.at || report.createdAt;
  const step2At = tTiepNhan?.at;
  const step3At = tGiao?.at;
  const step4At = isMoLai ? undefined : tHoanThanh?.at || report.completedAt;

  const hasStepEntry = (step: number): boolean => {
    switch (step) {
      case 1:
        return Boolean(step1At);
      case 2:
        return Boolean(step2At);
      case 3:
        return Boolean(step3At);
      case 4:
        return Boolean(step4At);
      default:
        return false;
    }
  };

  const getStepStatus = (step: number): 'done' | 'current' | 'upcoming' => {
    if (isDong) {
      return 'done';
    }
    if (step === targetStep) {
      return 'current';
    }
    if (step < targetStep) {
      return hasStepEntry(step) ? 'done' : 'upcoming';
    }
    return 'upcoming';
  };

  const step1Status = getStepStatus(1);
  const step2Status = getStepStatus(2);
  const step3Status = getStepStatus(3);
  const step4Status = getStepStatus(4);

  return [
    {
      step: 1,
      label: 'Chờ tiếp nhận',
      status: step1Status,
      at: step1Status !== 'upcoming' ? step1At : undefined,
    },
    {
      step: 2,
      label: 'Đã tiếp nhận',
      status: step2Status,
      at: step2Status !== 'upcoming' ? step2At : undefined,
      note: report.status === 'cho_xac_minh' ? 'Tình nguyện viên đang kiểm tra tại chỗ' : undefined,
    },
    {
      step: 3,
      label: 'Đang xử lý',
      status: step3Status,
      at: step3Status !== 'upcoming' ? step3At : undefined,
      department: report.department,
    },
    {
      step: 4,
      label: 'Đã xử lý',
      status: step4Status,
      at: step4Status !== 'upcoming' ? step4At : undefined,
      expected: step4Status === 'upcoming' ? report.dueAt : undefined,
    },
  ];
}
