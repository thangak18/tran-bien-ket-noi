import { describe, it, expect, beforeEach } from 'vitest';
import {
  submitReport,
  followReport,
  subscribeLater,
  unsubscribe,
  claimByLink,
  lookupReport,
  submitFeedback,
  supplementReport,
} from '@/store/citizenActions';
import { getInitialState, AppState } from '@/store/AppStore';
import mockData from '@/data/mock.json';
import { Report, VolunteerTask } from '@/domain/types';

describe('UT-021 – Actions người dân (spec 3.3, 3.4a, 3.4b, AC-C04/5/6)', () => {
  let state: AppState;
  const now = '2026-11-24T09:00:00+07:00';

  beforeEach(() => {
    state = {
      ...getInitialState(),
      reports: JSON.parse(JSON.stringify(mockData.reports)) as Report[],
      volunteerTasks: JSON.parse(JSON.stringify(mockData.volunteerTasks)) as VolunteerTask[],
    };
  });

  it('1. submitReport -> id TB-0065, status moi, followers = [phone], 1 timeline, 1 notification, secretCode 4 số, deviceReports thêm', () => {
    const res = submitReport(
      state,
      {
        category: 'mat_duong',
        photos: ['/photo1.jpg'],
        lat: 10.95,
        lng: 106.82,
        address: '100 CMT8',
        phone: '0909000068',
      },
      now
    );

    const newReport = res.report;
    expect(newReport.id).toBe('TB-0065');
    expect(newReport.status).toBe('moi');
    expect(newReport.followers).toEqual(['0909000068']);
    expect(newReport.reporterPhone).toBe('0909000068');
    expect(newReport.timeline).toHaveLength(1);
    expect(newReport.secretCode).toMatch(/^\d{4}$/);

    expect(res.state.settings.deviceReports).toContainEqual({
      id: 'TB-0065',
      secretCode: newReport.secretCode,
    });
    expect(res.state.notifications).toHaveLength(1);
    expect(res.state.notifications[0]?.message).toContain('TB-0065');
  });

  it('1b. submitReport({anonymous:true}) -> anonymous true, reporterPhone rỗng, không sinh notification, cập nhật deviceReports và anonymousLog', () => {
    const res = submitReport(
      state,
      {
        category: 'rac_thai',
        photos: ['/photo1.jpg'],
        lat: 10.95,
        lng: 106.82,
        address: '100 CMT8',
        anonymous: true,
      },
      now
    );

    const newReport = res.report;
    expect(newReport.id).toBe('TB-0065');
    expect(newReport.anonymous).toBe(true);
    expect(newReport.reporterPhone).toBeUndefined();
    expect(newReport.followers).toEqual([]);
    expect(newReport.anonymousFollows).toBe(1);

    expect(res.state.notifications).toHaveLength(0); // Không sinh notification
    expect(res.state.settings.anonymousLog).toContain(now);
    expect(res.state.settings.deviceReports).toContainEqual({
      id: 'TB-0065',
      secretCode: newReport.secretCode,
    });
  });

  it('1c. submitReport({anonymous:true}) lần thứ 6 trong 24h -> lỗi quota, không tạo hồ sơ', () => {
    // Thêm sẵn 5 lần gửi trong 24h
    state.settings.anonymousLog = [
      '2026-11-24T01:00:00+07:00',
      '2026-11-24T02:00:00+07:00',
      '2026-11-24T03:00:00+07:00',
      '2026-11-24T04:00:00+07:00',
      '2026-11-24T05:00:00+07:00',
    ];

    expect(() =>
      submitReport(
        state,
        {
          category: 'rac_thai',
          photos: ['/photo1.jpg'],
          lat: 10.95,
          lng: 106.82,
          address: '100 CMT8',
          anonymous: true,
        },
        now
      )
    ).toThrowError(/5 phản ánh|hạn mức/i);
  });

  it('2. Gửi tiếp -> TB-0066', () => {
    const res1 = submitReport(
      state,
      {
        category: 'mat_duong',
        photos: ['/p1.jpg'],
        lat: 10.95,
        lng: 106.82,
        address: '100 CMT8',
        phone: '0909000068',
      },
      now
    );
    const res2 = submitReport(
      res1.state,
      {
        category: 'den_duong',
        photos: ['/p2.jpg'],
        lat: 10.95,
        lng: 106.82,
        address: '102 CMT8',
        phone: '0909000068',
      },
      now
    );
    expect(res2.report.id).toBe('TB-0066');
  });

  it('3. followReport lần 3 người -> priority cao; gọi lại cùng SĐT -> không nhân đôi', () => {
    const reportId = 'TB-0008'; // Hồ sơ demo mat_duong đã có 2 followers
    const state1 = followReport(state, reportId, { phone: '0912333444' });
    const r1 = state1.reports.find((r) => r.id === reportId)!;
    expect(r1.followers).toContain('0912333444');
    expect(r1.priority).toBe('cao'); // 2 + 1 = 3 -> cao

    // Gọi lại với cùng SĐT
    const state2 = followReport(state1, reportId, { phone: '0912333444' });
    const r2 = state2.reports.find((r) => r.id === reportId)!;
    expect(r2.followers.filter((p) => p === '0912333444')).toHaveLength(1);
  });

  it('3b. followReport ẩn danh -> anonymousFollows + 1, followers không đổi', () => {
    const reportId = 'TB-0008';
    const initFollowers = state.reports.find((r) => r.id === reportId)!.followers.length;
    const initAnon = state.reports.find((r) => r.id === reportId)!.anonymousFollows;

    const nextState = followReport(state, reportId, { anonymous: true });
    const updated = nextState.reports.find((r) => r.id === reportId)!;
    expect(updated.anonymousFollows).toBe(initAnon + 1);
    expect(updated.followers.length).toBe(initFollowers);
  });

  it('3c. subscribeLater trên hồ sơ ẩn danh -> followers = [phone], subscribedLater true, notification; trên hồ sơ không ẩn danh -> lỗi', () => {
    // Tìm 1 hồ sơ ẩn danh chưa subscribe
    const anonReport = state.reports.find((r) => r.anonymous && !r.subscribedLater)!;
    const nextState = subscribeLater(state, anonReport.id, '0988777666', now);
    const updated = nextState.reports.find((r) => r.id === anonReport.id)!;
    expect(updated.followers).toEqual(['0988777666']);
    expect(updated.subscribedLater).toBe(true);
    expect(updated.anonymous).toBe(true);
    expect(nextState.notifications.some((n) => n.phone === '0988777666')).toBe(true);

    // Trên hồ sơ không ẩn danh -> lỗi
    const nonAnon = state.reports.find((r) => !r.anonymous)!;
    expect(() => subscribeLater(state, nonAnon.id, '0988777666', now)).toThrowError(/ẩn danh/i);
  });

  it('3d. unsubscribe -> gỡ phone, subscribedLater false', () => {
    const subscribed = state.reports.find((r) => r.subscribedLater)!;
    const phone = subscribed.followers[0]!;
    const nextState = unsubscribe(state, subscribed.id, phone);
    const updated = nextState.reports.find((r) => r.id === subscribed.id)!;
    expect(updated.followers).not.toContain(phone);
    expect(updated.subscribedLater).toBe(false);
  });

  it('3f. claimByLink(id, k) đúng -> thêm vào deviceReports; sai -> không đổi', () => {
    const report = state.reports[0]!;
    const nextState = claimByLink(state, report.id, report.secretCode);
    expect(nextState.settings.deviceReports).toContainEqual({
      id: report.id,
      secretCode: report.secretCode,
    });

    const invalidState = claimByLink(state, report.id, '0000');
    expect(invalidState.settings.deviceReports).not.toContainEqual({
      id: report.id,
      secretCode: '0000',
    });
  });

  it('3g. lookupReport khớp 4 số cuối SĐT hoặc secretCode -> trả hồ sơ; không khớp -> null', () => {
    const report = state.reports.find((r) => r.reporterPhone === '0909000068')!;
    // Khớp 4 số cuối SĐT '0068'
    expect(lookupReport(state.reports, report.id, '0068')).toEqual(report);
    // Khớp secretCode
    expect(lookupReport(state.reports, report.id, report.secretCode)).toEqual(report);
    // Không khớp
    expect(lookupReport(state.reports, report.id, '9999')).toBeNull();
  });

  it('4. submitFeedback({resolved:true, rating:4, tags:["Xử lý nhanh"]}) khi hoan_thanh -> dong', () => {
    const hoanThanhReport = state.reports.find((r) => r.status === 'hoan_thanh')!;
    const nextState = submitFeedback(
      state,
      hoanThanhReport.id,
      { resolved: true, rating: 4, tags: ['Xử lý nhanh'] },
      now
    );
    const updated = nextState.reports.find((r) => r.id === hoanThanhReport.id)!;
    expect(updated.status).toBe('dong');
    expect(updated.feedback?.rating).toBe(4);
    expect(updated.feedback?.tags).toEqual(['Xử lý nhanh']);
  });

  it('5. submitFeedback({resolved:false}) -> mo_lai + task nghiem_thu + thông báo kiểm tra lại', () => {
    const hoanThanhReport = state.reports.find((r) => r.status === 'hoan_thanh')!;
    const nextState = submitFeedback(
      state,
      hoanThanhReport.id,
      { resolved: false, comment: 'Đèn vẫn còn chập chờn' },
      now
    );
    const updated = nextState.reports.find((r) => r.id === hoanThanhReport.id)!;
    expect(updated.status).toBe('mo_lai');

    // 1 VolunteerTask nghiem_thu
    const task = nextState.volunteerTasks.find((t) => t.reportId === hoanThanhReport.id);
    expect(task).toBeDefined();
    expect(task?.type).toBe('nghiem_thu');
  });

  it('6. submitFeedback khi status != hoan_thanh -> lỗi', () => {
    const moiReport = state.reports.find((r) => r.status === 'moi')!;
    expect(() => submitFeedback(state, moiReport.id, { resolved: true }, now)).toThrowError(
      /hoàn thành/i
    );
  });

  it('7. supplementReport khi can_bo_sung -> moi', () => {
    const canBoSungReport = state.reports.find((r) => r.status === 'can_bo_sung')!;
    const nextState = supplementReport(
      state,
      canBoSungReport.id,
      {
        note: 'Đã bổ sung thêm vị trí chính xác trước số nhà 15',
      },
      now
    );
    const updated = nextState.reports.find((r) => r.id === canBoSungReport.id)!;
    expect(updated.status).toBe('moi');
  });
});
