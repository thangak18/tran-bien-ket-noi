import { describe, it, expect, beforeEach } from 'vitest';
import {
  acceptReport,
  assignVolunteer,
  assignDepartment,
  completeReport,
  requestSupplement,
  transferAgency,
  closeReport,
  mergeReports,
  splitReportAction,
  createOnBehalf,
  submitVerification,
  getCategoryConfig,
} from '@/store/officerActions';
import { getInitialState, AppState } from '@/store/AppStore';
import mockData from '@/data/mock.json';
import { Report, VolunteerTask } from '@/domain/types';

describe('UT-022 – Actions cán bộ và tình nguyện viên (spec 3.3, AC-A02, AC-A03, AC-V02)', () => {
  let state: AppState;
  const now = '2026-11-24T09:00:00+07:00';

  beforeEach(() => {
    state = {
      ...getInitialState(),
      reports: JSON.parse(JSON.stringify(mockData.reports)) as Report[],
      volunteerTasks: JSON.parse(JSON.stringify(mockData.volunteerTasks)) as VolunteerTask[],
    };
  });

  it('1. accept set department + dueAt mặc định = createdAt + hạn loại', () => {
    // Tìm 1 hồ sơ 'moi'
    const report = state.reports.find((r) => r.status === 'moi');
    expect(report).toBeDefined();
    if (!report) return;

    const initialTimelineCount = report.timeline.length;
    const nextState = acceptReport(state, report.id, undefined, now);
    const updated = nextState.reports.find((r) => r.id === report.id);

    expect(updated).toBeDefined();
    expect(updated?.status).toBe('da_tiep_nhan');
    const cfg = getCategoryConfig(report.category);
    expect(updated?.department).toBe(cfg.suggestedDepartment);

    // dueAt = createdAt + SLA
    const slaDays = cfg.defaultDays;
    const expectedDue = new Date(
      new Date(report.createdAt).getTime() + slaDays * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(updated?.dueAt).toBe(expectedDue);
    expect(updated?.timeline.length).toBe(initialTimelineCount + 1);
  });

  it('2. assignVolunteer -> cho_xac_minh + task xac_minh', () => {
    const report = state.reports.find((r) => r.status === 'moi' || r.status === 'da_tiep_nhan');
    expect(report).toBeDefined();
    if (!report) return;

    const initialTasksCount = state.volunteerTasks.length;
    const nextState = assignVolunteer(
      state,
      report.id,
      { assignee: 'Nguyễn Văn A', note: 'Nhờ anh A kiểm tra' },
      now
    );

    const updated = nextState.reports.find((r) => r.id === report.id);
    expect(updated?.status).toBe('cho_xac_minh');
    expect(nextState.volunteerTasks.length).toBe(initialTasksCount + 1);

    const newTask = nextState.volunteerTasks[0];
    expect(newTask?.reportId).toBe(report.id);
    expect(newTask?.type).toBe('xac_minh');
    expect(newTask?.assignee).toBe('Nguyễn Văn A');
    expect(newTask?.status).toBe('dang_lam');
  });

  it('3. submitVerification(exists: "co") -> task xong, report da_tiep_nhan; exists: "khong" -> report giữ cho_xac_minh', () => {
    // 3a: exists = 'co'
    const report1 = state.reports.find((r) => r.status === 'cho_xac_minh');
    expect(report1).toBeDefined();
    if (!report1) return;

    const task1 = state.volunteerTasks.find(
      (t) => t.reportId === report1.id && t.type === 'xac_minh'
    );
    expect(task1).toBeDefined();
    if (!task1) return;

    const nextState1 = submitVerification(
      state,
      task1.id,
      {
        exists: 'co',
        severity: 'trung_binh',
        photo: '/demo-photos/verify.jpg',
        note: 'Đúng là có ổ gà',
      },
      now
    );

    const updatedTask1 = nextState1.volunteerTasks.find((t) => t.id === task1.id);
    const updatedReport1 = nextState1.reports.find((r) => r.id === report1.id);

    expect(updatedTask1?.status).toBe('xong');
    expect(updatedTask1?.result?.exists).toBe('co');
    expect(updatedReport1?.status).toBe('da_tiep_nhan');

    // 3b: exists = 'khong' -> giữ cho_xac_minh
    const report2 = state.reports.filter((r) => r.status === 'cho_xac_minh')[1];
    expect(report2).toBeDefined();
    if (!report2) return;

    const task2 = state.volunteerTasks.find(
      (t) => t.reportId === report2.id && t.type === 'xac_minh'
    );
    expect(task2).toBeDefined();
    if (!task2) return;

    const nextState2 = submitVerification(
      state,
      task2.id,
      {
        exists: 'khong',
        photo: '/demo-photos/empty.jpg',
        note: 'Đã dọn sạch',
      },
      now
    );

    const updatedTask2 = nextState2.volunteerTasks.find((t) => t.id === task2.id);
    const updatedReport2 = nextState2.reports.find((r) => r.id === report2.id);

    expect(updatedTask2?.status).toBe('xong');
    expect(updatedTask2?.result?.exists).toBe('khong');
    expect(updatedReport2?.status).toBe('cho_xac_minh');
  });

  it('4. complete thông báo tới mọi follower của hồ sơ chính và hồ sơ đã gộp', () => {
    // Giả lập hồ sơ chính có gộp hồ sơ con
    let s = state;
    const rMain = s.reports.find((r) => r.status === 'da_giao');
    const rChild = s.reports.find((r) => r.status === 'moi' && r.id !== rMain?.id);
    expect(rMain).toBeDefined();
    expect(rChild).toBeDefined();
    if (!rMain || !rChild) return;

    // Gán follower cho cả hai
    s = {
      ...s,
      reports: s.reports.map((r) => {
        if (r.id === rMain.id) return { ...r, followers: ['0909111111'] };
        if (r.id === rChild.id) return { ...r, followers: ['0909222222'] };
        return r;
      }),
    };

    // Merge rChild vào rMain
    s = mergeReports(s, rMain.id, [rChild.id], undefined, now);

    // Complete rMain
    const nextState = completeReport(
      s,
      rMain.id,
      {
        resultPhotos: ['/demo-photos/after/fixed.jpg'],
        resultNote: 'Đã xử lý xong toàn bộ theo quy định kỹ thuật',
      },
      now
    );

    const updatedMain = nextState.reports.find((r) => r.id === rMain.id);
    expect(updatedMain?.status).toBe('hoan_thanh');
    expect(updatedMain?.completedAt).toBeDefined();
    expect(updatedMain?.resultPhotos).toEqual(['/demo-photos/after/fixed.jpg']);

    // Kiểm tra thông báo được gửi cho cả hai follower (chính và con)
    const notifs = nextState.notifications.filter(
      (n) => n.reportId === rMain.id || n.reportId === rChild.id
    );
    const phones = notifs.map((n) => n.phone);
    expect(phones).toContain('0909111111');
    expect(phones).toContain('0909222222');
  });

  it('5. merge(main, [a,b]) -> a,b da_gop, mergedInto = main; followers main = hợp của 3; ảnh a,b nối vào main; main.mergedChildren = [a,b]', () => {
    const main = state.reports.find((r) => r.status === 'da_tiep_nhan');
    const child1 = state.reports.find((r) => r.status === 'moi' && r.id !== main?.id);
    const child2 = state.reports.find(
      (r) => r.status === 'moi' && r.id !== main?.id && r.id !== child1?.id
    );
    expect(main && child1 && child2).toBeTruthy();
    if (!main || !child1 || !child2) return;

    const s = {
      ...state,
      reports: state.reports.map((r) => {
        if (r.id === main.id)
          return { ...r, followers: ['0901'], photos: ['/main.jpg'], anonymousFollows: 1 };
        if (r.id === child1.id)
          return { ...r, followers: ['0902'], photos: ['/c1.jpg'], anonymousFollows: 2 };
        if (r.id === child2.id)
          return { ...r, followers: ['0901', '0903'], photos: ['/c2.jpg'], anonymousFollows: 1 };
        return r;
      }),
    };

    const nextState = mergeReports(s, main.id, [child1.id, child2.id], undefined, now);

    const uMain = nextState.reports.find((r) => r.id === main.id);
    const uChild1 = nextState.reports.find((r) => r.id === child1.id);
    const uChild2 = nextState.reports.find((r) => r.id === child2.id);

    expect(uChild1?.status).toBe('da_gop');
    expect(uChild1?.mergedInto).toBe(main.id);
    expect(uChild1?.statusBeforeMerge).toBe(child1.status);

    expect(uChild2?.status).toBe('da_gop');
    expect(uChild2?.mergedInto).toBe(main.id);

    expect(uMain?.mergedChildren).toEqual([child1.id, child2.id]);
    // Followers hợp của 3 (0901, 0902, 0903)
    expect(uMain?.followers.sort()).toEqual(['0901', '0902', '0903'].sort());
    // Ảnh nối tiếp
    expect(uMain?.photos).toEqual(['/main.jpg', '/c1.jpg', '/c2.jpg']);
    // Anonymous follows cộng gộp
    expect(uMain?.anonymousFollows).toBe(4);
  });

  it('6. merge hồ sơ dong -> lỗi', () => {
    const main = state.reports.find((r) => r.status === 'da_tiep_nhan');
    const closed = state.reports.find((r) => r.status === 'dong');
    expect(main && closed).toBeTruthy();
    if (!main || !closed) return;

    expect(() => mergeReports(state, main.id, [closed.id], undefined, now)).toThrowError(
      /đã đóng|không thể gộp/i
    );
  });

  it('7. split(main, a) -> a về trạng thái cũ, rời followers đã thêm từ a khỏi main', () => {
    const main = state.reports.find((r) => r.status === 'da_tiep_nhan');
    const child = state.reports.find((r) => r.status === 'moi' && r.id !== main?.id);
    if (!main || !child) return;

    const s = {
      ...state,
      reports: state.reports.map((r) => {
        if (r.id === main.id) return { ...r, followers: ['0901'], photos: ['/main.jpg'] };
        if (r.id === child.id)
          return { ...r, status: 'moi' as const, followers: ['0902'], photos: ['/c.jpg'] };
        return r;
      }),
    };

    // Merge
    const mergedState = mergeReports(s, main.id, [child.id], undefined, now);

    // Split
    const nextState = splitReportAction(mergedState, main.id, child.id, undefined, now);

    const uMain = nextState.reports.find((r) => r.id === main.id);
    const uChild = nextState.reports.find((r) => r.id === child.id);

    expect(uChild?.status).toBe('moi');
    expect(uChild?.mergedInto).toBeUndefined();
    expect(uMain?.mergedChildren).not.toContain(child.id);
    expect(uMain?.followers).toEqual(['0901']);
    expect(uMain?.photos).toEqual(['/main.jpg']);
  });

  it('8. createOnBehalf -> onBehalf: true, status da_tiep_nhan, notification sms_mo_phong có mã', () => {
    const res = createOnBehalf(
      state,
      {
        phone: '0912345678',
        category: 'den_duong',
        address: '15 Huỳnh Văn Nghệ',
        lat: 10.952,
        lng: 106.825,
        description: 'Bóng đèn đường bị vỡ nguy hiểm',
      },
      now
    );

    const { report, notification, state: nextState } = res;
    expect(report.id).toBe('TB-0065');
    expect(report.onBehalf).toBe(true);
    expect(report.status).toBe('da_tiep_nhan');
    expect(report.reporterPhone).toBe('0912345678');
    expect(report.followers).toContain('0912345678');
    expect(report.department).toBe(getCategoryConfig('den_duong').suggestedDepartment);
    expect(report.secretCode).toMatch(/^\d{4}$/);

    expect(notification.channel).toBe('sms_mo_phong');
    expect(notification.phone).toBe('0912345678');
    expect(notification.message).toContain('TB-0065');
    expect(notification.message).toContain(report.secretCode);

    expect(nextState.reports[0]?.id).toBe('TB-0065');
  });

  it('9. assignDepartment -> da_giao, cập nhật department và dueAt', () => {
    const report = state.reports.find((r) => r.status === 'da_tiep_nhan');
    if (!report) return;

    const nextState = assignDepartment(
      state,
      report.id,
      {
        department: 'Ban Quản lý Đô thị',
        dueAt: '2026-11-28T17:00:00+07:00',
        note: 'Giao kiểm tra ngay',
      },
      now
    );

    const updated = nextState.reports.find((r) => r.id === report.id);
    expect(updated?.status).toBe('da_giao');
    expect(updated?.department).toBe('Ban Quản lý Đô thị');
    expect(updated?.dueAt).toBe('2026-11-28T17:00:00+07:00');
  });

  it('10. requestSupplement -> can_bo_sung với lý do bắt buộc', () => {
    const report = state.reports.find((r) => r.status === 'moi');
    if (!report) return;

    const nextState = requestSupplement(
      state,
      report.id,
      {
        reason: 'Ảnh bị mờ, vui lòng chụp lại rõ vị trí ổ gà',
      },
      now
    );

    const updated = nextState.reports.find((r) => r.id === report.id);
    expect(updated?.status).toBe('can_bo_sung');
    expect(updated?.timeline[updated.timeline.length - 1]?.note).toContain('Ảnh bị mờ');
  });

  it('11. transferAgency -> chuyen_co_quan kèm tên cơ quan và lý do', () => {
    const report = state.reports.find((r) => r.status === 'moi');
    if (!report) return;

    const nextState = transferAgency(
      state,
      report.id,
      {
        agency: 'Công an Phường Trấn Biên',
        reason: 'Thuộc thẩm quyền giải quyết trật tự an toàn giao thông',
      },
      now
    );

    const updated = nextState.reports.find((r) => r.id === report.id);
    expect(updated?.status).toBe('chuyen_co_quan');
  });

  it('12. closeReport -> dong', () => {
    const report = state.reports.find((r) => r.status === 'mo_lai');
    if (!report) return;

    const nextState = closeReport(
      state,
      report.id,
      {
        reason: 'Đã kiểm tra lại hiện trường và xử lý hoàn tất',
      },
      now
    );

    const updated = nextState.reports.find((r) => r.id === report.id);
    expect(updated?.status).toBe('dong');
  });
});
