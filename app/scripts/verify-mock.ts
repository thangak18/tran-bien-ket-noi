import fs from 'node:fs';
import path from 'node:path';
import { Report, VolunteerTask, Status } from '../src/domain/types';
import { haversineMeters } from '../src/domain/geo';
import { isOverdue } from '../src/domain/sorting';
import { DEMO_NOW, ALL_FEEDBACK_TAGS, CATEGORY_CONFIGS } from '../src/domain/constants';
import { WARD_CENTER } from '../src/data/streets';

const mockPath = path.resolve(process.cwd(), 'src/data/mock.json');

if (!fs.existsSync(mockPath)) {
  console.error(
    'LỖI: Không tìm thấy file src/data/mock.json! Hãy chạy npm run mock:generate trước.'
  );
  process.exit(1);
}

const raw = fs.readFileSync(mockPath, 'utf-8');
const data: { reports: Report[]; volunteerTasks: VolunteerTask[] } = JSON.parse(raw);
const { reports, volunteerTasks } = data;

interface CheckResult {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const checks: CheckResult[] = [];

// DV-001
const inNov = reports.filter((r) => r.createdAt.startsWith('2026-11')).length;
checks.push({
  id: 'DV-001',
  name: '64 hồ sơ tháng 11/2026',
  expected: '64',
  actual: `${inNov}`,
  passed: reports.length === 64 && inNov === 64,
});

// DV-002
const catCounts: Record<string, number> = {
  den_duong: 0,
  ngap_nuoc: 0,
  rac_thai: 0,
  mat_duong: 0,
};
for (const r of reports) catCounts[r.category] = (catCounts[r.category] ?? 0) + 1;
checks.push({
  id: 'DV-002',
  name: 'Theo loại: 18 / 15 / 21 / 10',
  expected: '18 / 15 / 21 / 10',
  actual: `${catCounts['den_duong']} / ${catCounts['ngap_nuoc']} / ${catCounts['rac_thai']} / ${catCounts['mat_duong']}`,
  passed:
    catCounts['den_duong'] === 18 &&
    catCounts['ngap_nuoc'] === 15 &&
    catCounts['rac_thai'] === 21 &&
    catCounts['mat_duong'] === 10,
});

// DV-003
const resolvedReports = reports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong');
const openCount = reports.length - resolvedReports.length;
checks.push({
  id: 'DV-003',
  name: 'Đã xử lý 47, chưa hoàn tất 17',
  expected: '47 đã xử lý / 17 chưa xong',
  actual: `${resolvedReports.length} / ${openCount}`,
  passed: resolvedReports.length === 47 && openCount === 17,
});

// DV-004
let totalDays = 0;
for (const r of resolvedReports) {
  if (r.completedAt && r.createdAt) {
    const diff = new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime();
    totalDays += diff / (24 * 3600 * 1000);
  }
}
const avgDays = totalDays / resolvedReports.length;
const avgDiff = Math.abs(avgDays - 3.2);
checks.push({
  id: 'DV-004',
  name: 'Trung bình xử lý = 3,2 ngày (sai số ≤ 0,005)',
  expected: '3.2 (sai số <= 0.005)',
  actual: `${avgDays.toFixed(4)} (lệch ${avgDiff.toFixed(4)})`,
  passed: avgDiff <= 0.005,
});

// DV-005
const resCatCounts: Record<string, number> = {
  den_duong: 0,
  ngap_nuoc: 0,
  rac_thai: 0,
  mat_duong: 0,
};
for (const r of resolvedReports) resCatCounts[r.category] = (resCatCounts[r.category] ?? 0) + 1;
const dongCount = reports.filter((r) => r.status === 'dong').length;
const hoanThanhCount = reports.filter((r) => r.status === 'hoan_thanh').length;
const openStatusCounts: Record<string, number> = {};
for (const r of reports) {
  if (r.status !== 'dong' && r.status !== 'hoan_thanh') {
    openStatusCounts[r.status] = (openStatusCounts[r.status] ?? 0) + 1;
  }
}
const dv005Passed =
  resCatCounts['den_duong'] === 13 &&
  resCatCounts['ngap_nuoc'] === 11 &&
  resCatCounts['rac_thai'] === 16 &&
  resCatCounts['mat_duong'] === 7 &&
  dongCount === 40 &&
  hoanThanhCount === 7 &&
  openStatusCounts['moi'] === 4 &&
  openStatusCounts['da_tiep_nhan'] === 4 &&
  openStatusCounts['cho_xac_minh'] === 3 &&
  openStatusCounts['da_giao'] === 4 &&
  openStatusCounts['can_bo_sung'] === 1 &&
  openStatusCounts['mo_lai'] === 1;

checks.push({
  id: 'DV-005',
  name: 'Phân bổ loại & trạng thái spec 5.2',
  expected: '13/11/16/7; 40 đóng, 7 HT; mở: 4/4/3/4/1/1',
  actual: `${resCatCounts['den_duong']}/${resCatCounts['ngap_nuoc']}/${resCatCounts['rac_thai']}/${resCatCounts['mat_duong']}; ${dongCount} đóng, ${hoanThanhCount} HT; mở: ${openStatusCounts['moi']}/${openStatusCounts['da_tiep_nhan']}/${openStatusCounts['cho_xac_minh']}/${openStatusCounts['da_giao']}/${openStatusCounts['can_bo_sung']}/${openStatusCounts['mo_lai']}`,
  passed: dv005Passed,
});

// DV-006
const nowMs = new Date(DEMO_NOW).getTime();
let dv006Passed = true;
for (const r of resolvedReports) {
  if (!r.completedAt) {
    dv006Passed = false;
    break;
  }
  const cMs = new Date(r.completedAt).getTime();
  const crMs = new Date(r.createdAt).getTime();
  if (cMs > nowMs || cMs <= crMs) {
    dv006Passed = false;
    break;
  }
  const d = (cMs - crMs) / (24 * 3600 * 1000);
  if (d < 0.5 || d > 8.0) {
    dv006Passed = false;
    break;
  }
}
checks.push({
  id: 'DV-006',
  name: 'completedAt ≤ demoNow và khoảng [0,5; 8] ngày',
  expected: 'completedAt ≤ demoNow & duration in [0.5, 8.0]',
  actual: dv006Passed ? 'Đạt' : 'Không đạt',
  passed: dv006Passed,
});

// DV-007
let dv007Passed = true;
for (const r of reports) {
  if (r.lat < 10.925 || r.lat > 10.975 || r.lng < 106.79 || r.lng > 106.86) {
    dv007Passed = false;
    break;
  }
}
checks.push({
  id: 'DV-007',
  name: 'Tọa độ trong khung lat 10.925-10.975, lng 106.790-106.860',
  expected: 'Trong khung phường',
  actual: dv007Passed ? 'Đạt' : 'Ngoài khung',
  passed: dv007Passed,
});

// DV-008
const overdueDaGiao = reports.filter(
  (r) => r.status === 'da_giao' && isOverdue(r, DEMO_NOW)
).length;
checks.push({
  id: 'DV-008',
  name: 'Đúng 2 hồ sơ da_giao quá hạn tại demoNow',
  expected: '2',
  actual: `${overdueDaGiao}`,
  passed: overdueDaGiao === 2,
});

// DV-009
const openReports = reports.filter((r) => r.status !== 'dong' && r.status !== 'hoan_thanh');
const duplicatePairs: [string, string][] = [];
for (let i = 0; i < openReports.length; i++) {
  for (let j = i + 1; j < openReports.length; j++) {
    const a = openReports[i]!;
    const b = openReports[j]!;
    if (a.category === b.category) {
      const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
      if (dist <= 50) {
        duplicatePairs.push([a.id, b.id]);
      }
    }
  }
}
checks.push({
  id: 'DV-009',
  name: 'Đúng 2 cụm nghi trùng (cách 20–45 m) trong nhóm mở',
  expected: '2 cụm',
  actual: `${duplicatePairs.length} cụm`,
  passed: duplicatePairs.length === 2,
});

// DV-010
const demoReport = reports.find(
  (r) =>
    r.category === 'mat_duong' &&
    r.status === 'da_tiep_nhan' &&
    r.followers.length === 2 &&
    haversineMeters(r.lat, r.lng, WARD_CENTER.lat, WARD_CENTER.lng) <= 300
);
checks.push({
  id: 'DV-010',
  name: 'Hồ sơ demo mat_duong da_tiep_nhan 2 followers gần tâm',
  expected: 'Tìm thấy hồ sơ',
  actual: demoReport ? `${demoReport.id}` : 'Không tìm thấy',
  passed: !!demoReport,
});

// DV-011
let dv011Passed = true;
for (let i = 1; i <= 64; i++) {
  const expectedId = `TB-${i.toString().padStart(4, '0')}`;
  if (reports[i - 1]?.id !== expectedId) {
    dv011Passed = false;
    break;
  }
}
checks.push({
  id: 'DV-011',
  name: 'ID duy nhất, liên tục TB-0001 -> TB-0064',
  expected: 'TB-0001 -> TB-0064',
  actual: dv011Passed ? 'Đạt' : 'Không đạt',
  passed: dv011Passed,
});

// DV-012
const dongAllHaveRating = reports
  .filter((r) => r.status === 'dong')
  .every(
    (r) =>
      r.feedback?.rating &&
      r.feedback.rating >= 1 &&
      r.feedback.rating <= 5 &&
      Array.isArray(r.feedback.tags) &&
      r.feedback.tags.length > 0 &&
      r.feedback.tags.every((t) => ALL_FEEDBACK_TAGS.includes(t))
  );
const hoanThanhNoFeedback = reports
  .filter((r) => r.status === 'hoan_thanh')
  .every((r) => !r.feedback);
const choXacMinhReports = reports.filter((r) => r.status === 'cho_xac_minh');
const tasksMatch =
  volunteerTasks.length === 3 &&
  volunteerTasks.every((t) => choXacMinhReports.some((r) => r.id === t.reportId));

checks.push({
  id: 'DV-012',
  name: '40 hồ sơ đóng có rating 1–5 và tags thuộc bộ chip; 7 HT không feedback; 3 tasks cho_xac_minh',
  expected: 'Đầy đủ điều kiện',
  actual: dongAllHaveRating && hoanThanhNoFeedback && tasksMatch ? 'Đạt' : 'Không đạt',
  passed: dongAllHaveRating && hoanThanhNoFeedback && tasksMatch,
});

// DV-014
const anonReports = reports.filter((r) => r.anonymous);
const anonPhoneEmpty = anonReports.every((r) => !r.reporterPhone);
const subscribedCount = anonReports.filter((r) => r.subscribedLater).length;
const allHaveSecretCode = reports.every((r) => /^\d{4}$/.test(r.secretCode));
const anonCat: Record<string, number> = {};
for (const r of anonReports) anonCat[r.category] = (anonCat[r.category] ?? 0) + 1;
const anonResolvedCount = anonReports.filter(
  (r) => r.status === 'dong' || r.status === 'hoan_thanh'
).length;
const anonOpenCount = anonReports.length - anonResolvedCount;

const dv014Passed =
  anonReports.length === 6 &&
  anonCat['rac_thai'] === 3 &&
  anonCat['den_duong'] === 1 &&
  anonCat['ngap_nuoc'] === 1 &&
  anonCat['mat_duong'] === 1 &&
  anonPhoneEmpty &&
  subscribedCount === 1 &&
  allHaveSecretCode &&
  anonResolvedCount > 0 &&
  anonOpenCount > 0;

checks.push({
  id: 'DV-014',
  name: '6 hồ sơ ẩn danh (3 rác, 1 đèn, 1 ngập, 1 đường), 1 đã nhận tin, secretCode 4 số',
  expected: '6 ẩn danh, 1 subscribedLater, đủ 4 số',
  actual: dv014Passed ? 'Đạt' : 'Không đạt',
  passed: dv014Passed,
});

// DV-015
let dv015Passed = true;
let dv015Msg = 'Đạt';

for (const r of reports) {
  if (!r.timeline || r.timeline.length === 0) {
    dv015Passed = false;
    dv015Msg = `${r.id}: timeline rỗng`;
    break;
  }

  const lastEntry = r.timeline[r.timeline.length - 1]!;
  if (lastEntry.status !== r.status) {
    dv015Passed = false;
    dv015Msg = `${r.id}: status cuối (${lastEntry.status}) != ${r.status}`;
    break;
  }

  for (let i = 1; i < r.timeline.length; i++) {
    const prevMs = new Date(r.timeline[i - 1]!.at).getTime();
    const currMs = new Date(r.timeline[i]!.at).getTime();
    if (currMs <= prevMs) {
      dv015Passed = false;
      dv015Msg = `${r.id}: thời điểm timeline không tăng dần tại bước ${i}`;
      break;
    }
  }
  if (!dv015Passed) break;

  const timelineStatuses = r.timeline.map((t) => t.status);
  if (r.status === 'dong') {
    const expected: Status[] = ['moi', 'da_tiep_nhan', 'da_giao', 'hoan_thanh', 'dong'];
    if (!expected.every((st) => timelineStatuses.includes(st))) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline dong thiếu bước`;
      break;
    }
  } else if (r.status === 'hoan_thanh') {
    const expected: Status[] = ['moi', 'da_tiep_nhan', 'da_giao', 'hoan_thanh'];
    if (!expected.every((st) => timelineStatuses.includes(st))) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline hoan_thanh thiếu bước`;
      break;
    }
  } else if (r.status === 'da_giao') {
    const expected: Status[] = ['moi', 'da_tiep_nhan', 'da_giao'];
    if (!expected.every((st) => timelineStatuses.includes(st))) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline da_giao thiếu bước`;
      break;
    }
  } else if (r.status === 'cho_xac_minh') {
    if (!timelineStatuses.includes('moi') || !timelineStatuses.includes('cho_xac_minh')) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline cho_xac_minh thiếu bước`;
      break;
    }
  } else if (r.status === 'da_tiep_nhan') {
    if (!timelineStatuses.includes('moi') || !timelineStatuses.includes('da_tiep_nhan')) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline da_tiep_nhan thiếu bước`;
      break;
    }
  } else if (r.status === 'can_bo_sung') {
    if (!timelineStatuses.includes('moi') || !timelineStatuses.includes('can_bo_sung')) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline can_bo_sung thiếu bước`;
      break;
    }
  } else if (r.status === 'mo_lai') {
    const expected: Status[] = ['moi', 'da_tiep_nhan', 'da_giao', 'hoan_thanh', 'mo_lai'];
    if (!expected.every((st) => timelineStatuses.includes(st))) {
      dv015Passed = false;
      dv015Msg = `${r.id}: timeline mo_lai thiếu bước`;
      break;
    }
  }

  const daGiaoEntry = r.timeline.find((t) => t.status === 'da_giao');
  if (daGiaoEntry) {
    if (!daGiaoEntry.note || !daGiaoEntry.note.includes('Giao ')) {
      dv015Passed = false;
      dv015Msg = `${r.id}: da_giao thiếu note giao bộ phận`;
      break;
    }
  }

  if (r.completedAt) {
    const hoanThanhEntry = r.timeline.find((t) => t.status === 'hoan_thanh');
    if (!hoanThanhEntry || hoanThanhEntry.at !== r.completedAt) {
      dv015Passed = false;
      dv015Msg = `${r.id}: hoan_thanh (${hoanThanhEntry?.at}) != completedAt (${r.completedAt})`;
      break;
    }
  }
}

checks.push({
  id: 'DV-015',
  name: 'Timeline mạch lạc, qua đủ bước, tăng dần, hoan_thanh = completedAt',
  expected: 'Đạt',
  actual: dv015Passed ? 'Đạt' : dv015Msg,
  passed: dv015Passed,
});

// DV-016
let dv016Passed = true;
let dv016Msg = 'Đạt';
const ISO_OFFSET7_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

for (const r of reports) {
  if (!ISO_OFFSET7_REGEX.test(r.createdAt)) {
    dv016Passed = false;
    dv016Msg = `${r.id}: createdAt không có +07:00 (${r.createdAt})`;
    break;
  }
  if (r.completedAt && !ISO_OFFSET7_REGEX.test(r.completedAt)) {
    dv016Passed = false;
    dv016Msg = `${r.id}: completedAt không có +07:00 (${r.completedAt})`;
    break;
  }
  if (r.dueAt && !ISO_OFFSET7_REGEX.test(r.dueAt)) {
    dv016Passed = false;
    dv016Msg = `${r.id}: dueAt không có +07:00 (${r.dueAt})`;
    break;
  }
  if (r.feedback?.at && !ISO_OFFSET7_REGEX.test(r.feedback.at)) {
    dv016Passed = false;
    dv016Msg = `${r.id}: feedback.at không có +07:00 (${r.feedback.at})`;
    break;
  }
  for (const t of r.timeline) {
    if (!ISO_OFFSET7_REGEX.test(t.at)) {
      dv016Passed = false;
      dv016Msg = `${r.id}: timeline.at không có +07:00 (${t.at})`;
      break;
    }
  }
  if (!dv016Passed) break;

  const cfg = CATEGORY_CONFIGS.find((c) => c.key === r.category)!;

  if (r.status === 'moi') {
    if (r.department && r.department !== '') {
      dv016Passed = false;
      dv016Msg = `${r.id}: moi có department (${r.department})`;
      break;
    }
    if (r.dueAt) {
      dv016Passed = false;
      dv016Msg = `${r.id}: moi có dueAt (${r.dueAt})`;
      break;
    }
  } else {
    if (r.department !== cfg.suggestedDepartment) {
      dv016Passed = false;
      dv016Msg = `${r.id}: department (${r.department}) != gợi ý (${cfg.suggestedDepartment})`;
      break;
    }
    const tTiepNhan = r.timeline.find((t) => t.status === 'da_tiep_nhan');
    if (!tTiepNhan) {
      dv016Passed = false;
      dv016Msg = `${r.id}: thiếu da_tiep_nhan trong timeline`;
      break;
    }
    if (!r.dueAt) {
      dv016Passed = false;
      dv016Msg = `${r.id}: thiếu dueAt`;
      break;
    }
    const expectedDueMs = new Date(tTiepNhan.at).getTime() + cfg.defaultDays * 24 * 60 * 60 * 1000;
    const actualDueMs = new Date(r.dueAt).getTime();
    if (actualDueMs !== expectedDueMs) {
      dv016Passed = false;
      dv016Msg = `${r.id}: dueAt lệch so với tiếp nhận + ${cfg.defaultDays} ngày`;
      break;
    }
  }
}

checks.push({
  id: 'DV-016',
  name: 'department rỗng ở moi; từ da_tiep_nhan đúng bộ phận & dueAt; chuẩn +07:00',
  expected: 'Đạt',
  actual: dv016Passed ? 'Đạt' : dv016Msg,
  passed: dv016Passed,
});

// In bảng kết quả
console.log('\n=== KẾT QUẢ KIỂM TRA BẤT BIẾN DỮ LIỆU (DATA VALIDATION) ===');
console.log('--------------------------------------------------------------------------------');
console.log(
  'ID'.padEnd(8) +
    ' | ' +
    'Kiểm tra'.padEnd(42) +
    ' | ' +
    'Kết quả'.padEnd(10) +
    ' | Giá trị thực tế'
);
console.log('--------------------------------------------------------------------------------');

let allPassed = true;
for (const c of checks) {
  const statusStr = c.passed ? '✓ PASS' : '✗ FAIL';
  if (!c.passed) allPassed = false;
  console.log(
    c.id.padEnd(8) + ' | ' + c.name.padEnd(42) + ' | ' + statusStr.padEnd(10) + ' | ' + c.actual
  );
}
console.log('--------------------------------------------------------------------------------\n');

if (!allPassed) {
  console.error('LỖI: Có ít nhất một tiêu chí kiểm tra dữ liệu mẫu không đạt!');
  process.exit(1);
} else {
  console.log('TOÀN BỘ BẤT BIẾN DỮ LIỆU ĐÃ ĐƯỢC XÁC THỰC THÀNH CÔNG (100% PASS).\n');
  process.exit(0);
}
