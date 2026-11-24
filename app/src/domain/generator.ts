import { Report, VolunteerTask, Category, Status, TimelineEntry } from './types';
import { STREETS, WARD_CENTER } from '../data/streets';
import { FEEDBACK_POSITIVE_TAGS, FEEDBACK_NEGATIVE_TAGS, CATEGORY_CONFIGS } from './constants';

/**
 * Định dạng thời điểm sang chuẩn ISO có múi giờ +07:00 (không dùng Z)
 */
export function toIsoOffset7(msOrIso: number | string): string {
  const ms = typeof msOrIso === 'number' ? msOrIso : new Date(msOrIso).getTime();
  const local = new Date(ms + 7 * 60 * 60 * 1000);
  const iso = local.toISOString();
  return iso.substring(0, 19) + '+07:00';
}

/**
 * Hàm PRNG Mulberry32 (plan 2, UT-019)
 */
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getLocalHM(ms: number) {
  const d = new Date(ms + 7 * 3600 * 1000);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

function isOfficeHours(ms: number): boolean {
  const { h, m } = getLocalHM(ms);
  if (h < 7) return false;
  if (h > 17) return false;
  if (h === 17 && m > 30) return false;
  return true;
}

function isCitizenHours(ms: number): boolean {
  const { h } = getLocalHM(ms);
  return h >= 6 && h <= 21;
}

function nextOfficeHours(ms: number): number {
  const { h, m } = getLocalHM(ms);
  if (h < 7) {
    return ms + ((7 - h) * 60 + (30 - m)) * 60 * 1000;
  }
  if (h > 17 || (h === 17 && m > 30)) {
    const minToMid = (23 - h) * 60 + (60 - m);
    return ms + (minToMid + 7 * 60 + 30) * 60 * 1000;
  }
  return ms;
}

export interface GeneratedData {
  reports: Report[];
  volunteerTasks: VolunteerTask[];
}

export const DEFAULT_SEED = 20261124;

interface SpecDistribution {
  category: Category;
  resolved: { dong: number; hoan_thanh: number };
  open: {
    status: Status;
    overdue?: boolean;
    isDemo?: boolean;
    cluster?: 1 | 2;
    anonymous?: boolean;
    subscribedLater?: boolean;
  }[];
  anonymousResolvedCount: number;
}

/**
 * Sinh bộ dữ liệu mẫu 64 phản ánh và 3 nhiệm vụ tình nguyện viên (spec 5, DV-001 -> DV-016)
 */
export function generateMockData(seed: number = DEFAULT_SEED): GeneratedData {
  const rand = mulberry32(seed);

  const distributions: SpecDistribution[] = [
    {
      category: 'mat_duong', // 10 tổng = 7 đã xử lý + 3 mở
      resolved: { dong: 6, hoan_thanh: 1 },
      open: [
        { status: 'da_tiep_nhan', isDemo: true }, // Demo report
        { status: 'da_giao', overdue: true, cluster: 1 }, // Cụm trùng 1 (A)
        { status: 'moi', cluster: 1 }, // Cụm trùng 1 (B)
      ],
      anonymousResolvedCount: 1,
    },
    {
      category: 'den_duong', // 18 tổng = 13 đã xử lý + 5 mở
      resolved: { dong: 11, hoan_thanh: 2 },
      open: [
        { status: 'da_tiep_nhan', cluster: 2 }, // Cụm trùng 2 (A)
        { status: 'cho_xac_minh', cluster: 2 }, // Cụm trùng 2 (B)
        { status: 'moi' },
        { status: 'da_giao', overdue: true }, // Quá hạn thứ 2
        { status: 'da_giao', overdue: false },
      ],
      anonymousResolvedCount: 1,
    },
    {
      category: 'ngap_nuoc', // 15 tổng = 11 đã xử lý + 4 mở
      resolved: { dong: 9, hoan_thanh: 2 },
      open: [
        { status: 'moi' },
        { status: 'da_tiep_nhan' },
        { status: 'cho_xac_minh', anonymous: true }, // 1 ẩn danh mở
        { status: 'da_giao', overdue: false },
      ],
      anonymousResolvedCount: 0,
    },
    {
      category: 'rac_thai', // 21 tổng = 16 đã xử lý + 5 mở
      resolved: { dong: 14, hoan_thanh: 2 },
      open: [
        { status: 'moi' },
        { status: 'da_tiep_nhan' },
        { status: 'cho_xac_minh' },
        { status: 'can_bo_sung' },
        { status: 'mo_lai', anonymous: true, subscribedLater: true }, // 1 ẩn danh đã nhận tin sau
      ],
      anonymousResolvedCount: 2,
    },
  ];

  // 1. Phân bổ thời gian xử lý cho 47 hồ sơ (tổng đúng 150.4 ngày, DV-004, DV-006)
  const targetTotalDays = 150.4;
  const totalResolved = 47;
  const rawDurations: number[] = [];
  let rawSum = 0;

  for (let i = 0; i < totalResolved; i++) {
    // Giá trị thô trong khoảng 1.8 đến 4.6 (quanh 3.2)
    const val = 1.8 + rand() * 2.8;
    rawDurations.push(val);
    rawSum += val;
  }

  // Chuẩn hoá để tổng đúng 150.4
  const scale = targetTotalDays / rawSum;
  const durations: number[] = rawDurations.map((v) => Math.round(v * scale * 100) / 100);
  const currentSum = durations.reduce((a, b) => a + b, 0);
  const remainder = Math.round((targetTotalDays - currentSum) * 100) / 100;
  durations[0] = Math.round((durations[0]! + remainder) * 100) / 100;

  let durationIndex = 0;
  let reportIdCounter = 1;
  const reports: Report[] = [];
  const volunteerTasks: VolunteerTask[] = [];
  const createdTimeCounts = new Map<string, number>();

  // Tọa độ cụm trùng 1 (mat_duong, khoảng cách ~28m)
  const cluster1Base = { lat: 10.952, lng: 106.824 };
  const cluster1Reports = [
    { lat: cluster1Base.lat, lng: cluster1Base.lng },
    { lat: cluster1Base.lat + 0.00025, lng: cluster1Base.lng }, // ~28m
  ];

  // Tọa độ cụm trùng 2 (den_duong, khoảng cách ~33m)
  const cluster2Base = { lat: 10.949, lng: 106.821 };
  const cluster2Reports = [
    { lat: cluster2Base.lat, lng: cluster2Base.lng },
    { lat: cluster2Base.lat + 0.0003, lng: cluster2Base.lng }, // ~33m
  ];

  // Lấy các điểm tọa độ cố định phân tán để tránh vô tình trùng
  let streetIdx = 0;
  function getDispersedCoord() {
    const s = STREETS[streetIdx % STREETS.length]!;
    streetIdx++;
    // Dịch chuyển nhỏ theo chỉ số để không bị trùng tọa độ
    const offsetLat = ((streetIdx % 7) - 3) * 0.002;
    const offsetLng = (((streetIdx * 3) % 7) - 3) * 0.002;
    return {
      lat: Math.min(10.97, Math.max(10.93, s.lat + offsetLat)),
      lng: Math.min(106.85, Math.max(106.8, s.lng + offsetLng)),
      streetName: s.name,
    };
  }

  for (const dist of distributions) {
    const { category, resolved, open, anonymousResolvedCount } = dist;
    const cfg = CATEGORY_CONFIGS.find((c) => c.key === category)!;
    const suggestedDept = cfg.suggestedDepartment;
    const defaultDays = cfg.defaultDays;

    // A. Tạo hồ sơ đã xử lý
    const resolvedItems: { status: Status; isDong: boolean; isAnonymous: boolean }[] = [];
    for (let i = 0; i < resolved.dong; i++) {
      resolvedItems.push({
        status: 'dong',
        isDong: true,
        isAnonymous: i < anonymousResolvedCount,
      });
    }
    for (let i = 0; i < resolved.hoan_thanh; i++) {
      resolvedItems.push({
        status: 'hoan_thanh',
        isDong: false,
        isAnonymous: false,
      });
    }

    for (const item of resolvedItems) {
      const tempId = `TEMP-${reportIdCounter.toString().padStart(4, '0')}`;
      reportIdCounter++;

      const coord = getDispersedCoord();
      const durationDays = durations[durationIndex++]!;
      const durationMs = durationDays * 24 * 60 * 60 * 1000;

      // Tìm createdAt (06:00 - 21:00, phút bất kỳ) rải ngẫu nhiên trong 01-23/11 sao cho completedAt rơi vào giờ HC (07:00-17:30) và <= demoNow
      const demoNowMs = new Date('2026-11-24T09:00:00+07:00').getTime();
      const nov1Ms = new Date('2026-11-01T00:00:00+07:00').getTime();
      const maxDayAllowed = Math.max(
        1,
        Math.min(23, Math.floor((demoNowMs - durationMs - nov1Ms) / (24 * 3600 * 1000)))
      );

      const remMin = Math.round((durationMs % (24 * 3600 * 1000)) / 60000);
      const validMinutes: number[] = [];
      for (let m = 360; m <= 1260; m++) {
        const compMin = (m + remMin) % 1440;
        if (compMin >= 420 && compMin <= 1050) {
          validMinutes.push(m);
        }
      }

      let chosenCreatedMs = 0;
      let chosenCompletedMs = 0;
      let attempts = 0;

      while (attempts < 2000) {
        attempts++;
        const day = 1 + Math.floor(rand() * maxDayAllowed);
        const min = validMinutes[Math.floor(rand() * validMinutes.length)]!;
        const h = Math.floor(min / 60);
        const m = min % 60;
        const hhmm = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        if ((createdTimeCounts.get(hhmm) || 0) < 2) {
          const cStr = `2026-11-${day.toString().padStart(2, '0')}T${hhmm}:00+07:00`;
          const cMs = new Date(cStr).getTime();
          const compMs = cMs + durationMs;
          if (compMs <= demoNowMs && isOfficeHours(compMs) && isCitizenHours(cMs)) {
            chosenCreatedMs = cMs;
            chosenCompletedMs = compMs;
            createdTimeCounts.set(hhmm, (createdTimeCounts.get(hhmm) || 0) + 1);
            break;
          }
        }
      }

      // Fallback an toàn nếu không tìm thấy sau 2000 lượt
      if (!chosenCreatedMs) {
        chosenCreatedMs = new Date('2026-11-02T08:00:00+07:00').getTime();
        chosenCompletedMs = chosenCreatedMs + durationMs;
      }

      const createdAt = toIsoOffset7(chosenCreatedMs);
      const completedAt = toIsoOffset7(chosenCompletedMs);

      // Mốc tiếp nhận và giao: thuộc giờ hành chính và tăng dần
      let step2Ms = nextOfficeHours(chosenCreatedMs + 20 * 60 * 1000);
      if (!isOfficeHours(step2Ms)) step2Ms = nextOfficeHours(step2Ms);
      let step3Ms = nextOfficeHours(step2Ms + 30 * 60 * 1000);
      if (!isOfficeHours(step3Ms)) step3Ms = nextOfficeHours(step3Ms);

      const step5Ms = chosenCompletedMs + 3600 * 1000;

      const tiepNhanAt = toIsoOffset7(step2Ms);
      const giaoAt = toIsoOffset7(step3Ms);
      const dongAt = toIsoOffset7(step5Ms);

      const dueAt = toIsoOffset7(step2Ms + defaultDays * 24 * 60 * 60 * 1000);

      const secretCode = (1000 + Math.floor(rand() * 9000)).toString();
      const rating = item.isDong ? Math.floor(rand() * 3) + 3 : undefined; // 3, 4, 5
      let tags: string[] | undefined = undefined;
      if (item.isDong) {
        if (rating! >= 4) {
          const idx = (reportIdCounter - 1) % FEEDBACK_POSITIVE_TAGS.length;
          tags = [FEEDBACK_POSITIVE_TAGS[idx]!];
        } else {
          const idx = (reportIdCounter - 1) % FEEDBACK_NEGATIVE_TAGS.length;
          tags = [FEEDBACK_NEGATIVE_TAGS[idx]!];
        }
      }

      const timeline: TimelineEntry[] = [
        { at: createdAt, status: 'moi', actor: 'Người dân' },
        { at: tiepNhanAt, status: 'da_tiep_nhan', actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận' },
        {
          at: giaoAt,
          status: 'da_giao',
          actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
          note: `Giao ${suggestedDept}`,
        },
        {
          at: completedAt,
          status: 'hoan_thanh',
          actor: suggestedDept,
          note: 'Đã hoàn thành kiểm tra và khắc phục sự cố tại hiện trường',
        },
      ];

      if (item.isDong) {
        timeline.push({
          at: dongAt,
          status: 'dong',
          actor: 'Người dân',
          note: 'Đã xác nhận kết quả',
        });
      }

      reports.push({
        id: tempId,
        category,
        photos: [`/demo-photos/${category}/${((reportIdCounter % 4) + 1).toString()}.jpg`],
        photosApproved: true,
        lat: coord.lat,
        lng: coord.lng,
        address: `${Math.floor(rand() * 150) + 1} Đường ${coord.streetName}`,
        createdAt,
        status: item.status,
        priority: 'binh_thuong',
        department: suggestedDept,
        dueAt,
        reporterPhone: item.isAnonymous ? undefined : '0909000068',
        anonymous: item.isAnonymous,
        subscribedLater: false,
        secretCode,
        onBehalf: false,
        followers: item.isAnonymous ? [] : ['0909000068'],
        anonymousFollows: item.isAnonymous ? 1 : 0,
        resultPhotos: [`/demo-photos/after/${category}.jpg`],
        resultNote: 'Đã hoàn thành kiểm tra và khắc phục sự cố tại hiện trường',
        completedAt,
        feedback: item.isDong
          ? {
              resolved: true,
              rating,
              tags,
              comment: 'Cảm ơn phường đã khắc phục nhanh chóng',
              at: dongAt,
            }
          : undefined,
        timeline,
      });
    }

    // B. Tạo hồ sơ chưa hoàn tất (mở)
    for (const openItem of open) {
      const tempId = `TEMP-${reportIdCounter.toString().padStart(4, '0')}`;
      reportIdCounter++;

      let lat: number;
      let lng: number;
      let address: string;

      if (openItem.isDemo) {
        // Hồ sơ demo mat_duong: cách tâm phường <= 300m
        lat = WARD_CENTER.lat + 0.0003;
        lng = WARD_CENTER.lng + 0.0003;
        address = '15 Đường Cách Mạng Tháng Tám';
      } else if (openItem.cluster === 1) {
        const c1 = cluster1Reports.pop()!;
        lat = c1.lat;
        lng = c1.lng;
        address = '45 Đường Hưng Đạo Vương';
      } else if (openItem.cluster === 2) {
        const c2 = cluster2Reports.pop()!;
        lat = c2.lat;
        lng = c2.lng;
        address = '12 Đường Phan Đình Phùng';
      } else {
        const coord = getDispersedCoord();
        lat = coord.lat;
        lng = coord.lng;
        address = `${Math.floor(rand() * 120) + 1} Đường ${coord.streetName}`;
      }

      // Thời gian tạo: hồ sơ quá hạn chọn ngày sớm để dueAt < demoNow
      let dayOffset: number;
      if (openItem.overdue) {
        dayOffset =
          category === 'mat_duong' ? 16 + Math.floor(rand() * 2) : 18 + Math.floor(rand() * 2);
      } else {
        // Hồ sơ không quá hạn: nếu có hạn xử lý (từ da_tiep_nhan trở đi), chọn ngày 22-23 để tiepNhan + defaultDays >= demoNow
        if (openItem.status === 'moi') {
          dayOffset = 21 + Math.floor(rand() * 3); // 21, 22, 23
        } else {
          dayOffset = 22 + Math.floor(rand() * 2); // 22, 23
        }
      }

      let chosenHhmm = '';
      let openAttempts = 0;
      while (openAttempts < 1000) {
        openAttempts++;
        const min = 360 + Math.floor(rand() * (1260 - 360 + 1));
        const h = Math.floor(min / 60);
        const m = min % 60;
        const hhmm = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if ((createdTimeCounts.get(hhmm) || 0) < 2) {
          chosenHhmm = hhmm;
          createdTimeCounts.set(hhmm, (createdTimeCounts.get(hhmm) || 0) + 1);
          break;
        }
      }
      if (!chosenHhmm) chosenHhmm = '08:15';
      const createdAt = `2026-11-${dayOffset.toString().padStart(2, '0')}T${chosenHhmm}:00+07:00`;
      const createdMs = new Date(createdAt).getTime();

      let department = '';
      let dueAt: string | undefined = undefined;
      let completedAt: string | undefined = undefined;
      let feedback = undefined;
      const timeline: TimelineEntry[] = [{ at: createdAt, status: 'moi', actor: 'Người dân' }];

      if (openItem.status === 'moi') {
        department = ''; // rỗng khi moi
        dueAt = undefined;
      } else {
        department = suggestedDept;
        const tiepNhanMs = nextOfficeHours(createdMs + 30 * 60 * 1000);
        const tiepNhanAt = toIsoOffset7(tiepNhanMs);
        dueAt = toIsoOffset7(tiepNhanMs + defaultDays * 24 * 60 * 60 * 1000);

        timeline.push({
          at: tiepNhanAt,
          status: 'da_tiep_nhan',
          actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
        });

        if (openItem.status === 'cho_xac_minh') {
          const xacMinhMs = nextOfficeHours(tiepNhanMs + 30 * 60 * 1000);
          const xacMinhAt = toIsoOffset7(xacMinhMs);
          timeline.push({
            at: xacMinhAt,
            status: 'cho_xac_minh',
            actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
            note: 'Giao tình nguyện viên kiểm tra tại chỗ',
          });
        } else if (openItem.status === 'da_giao') {
          const giaoMs = nextOfficeHours(tiepNhanMs + 30 * 60 * 1000);
          const giaoAt = toIsoOffset7(giaoMs);
          timeline.push({
            at: giaoAt,
            status: 'da_giao',
            actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
            note: `Giao ${suggestedDept}`,
          });
        } else if (openItem.status === 'can_bo_sung') {
          const boSungMs = nextOfficeHours(tiepNhanMs + 30 * 60 * 1000);
          const boSungAt = toIsoOffset7(boSungMs);
          timeline.push({
            at: boSungAt,
            status: 'can_bo_sung',
            actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
            note: 'Vui lòng chụp thêm ảnh rõ góc nhìn từ đầu hẻm để đội thu gom dễ xác định vị trí rác',
          });
        } else if (openItem.status === 'mo_lai') {
          const giaoMs = nextOfficeHours(tiepNhanMs + 30 * 60 * 1000);
          const giaoAt = toIsoOffset7(giaoMs);
          const hoanThanhMs = nextOfficeHours(giaoMs + 60 * 60 * 1000);
          const hoanThanhAt = toIsoOffset7(hoanThanhMs);
          const moLaiMs = hoanThanhMs + 60 * 60 * 1000;
          const moLaiAt = toIsoOffset7(moLaiMs);
          timeline.push(
            {
              at: giaoAt,
              status: 'da_giao',
              actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
              note: `Giao ${suggestedDept}`,
            },
            {
              at: hoanThanhAt,
              status: 'hoan_thanh',
              actor: suggestedDept,
              note: 'Đã hoàn thành kiểm tra và thu gom rác',
            },
            {
              at: moLaiAt,
              status: 'mo_lai',
              actor: 'Người dân',
              note: 'Rác vẫn còn tồn đọng ở góc hẻm chưa được dọn sạch',
            }
          );
          completedAt = hoanThanhAt;
          feedback = {
            resolved: false,
            comment: 'Chưa xử lý dứt điểm, rác vẫn còn ở góc hẻm',
            at: moLaiAt,
          };
        }
      }

      const isAnon = !!openItem.anonymous;
      const isSubscribed = !!openItem.subscribedLater;
      const followers = openItem.isDemo
        ? ['0912000001', '0912000002']
        : isAnon
          ? isSubscribed
            ? ['0909000068']
            : []
          : ['0909000068'];

      const secretCode = (1000 + Math.floor(rand() * 9000)).toString();

      reports.push({
        id: tempId,
        category,
        photos: [`/demo-photos/${category}/1.jpg`],
        photosApproved: true,
        lat,
        lng,
        address,
        createdAt,
        status: openItem.status,
        priority: 'binh_thuong',
        department,
        dueAt,
        completedAt,
        reporterPhone: isAnon ? undefined : '0909000068',
        anonymous: isAnon,
        subscribedLater: isSubscribed,
        secretCode,
        onBehalf: false,
        followers,
        anonymousFollows: isAnon && !isSubscribed ? 1 : 0,
        timeline,
        feedback,
      });

      // Nếu trạng thái là cho_xac_minh -> sinh VolunteerTask
      if (openItem.status === 'cho_xac_minh') {
        const taskId = `NV-${(volunteerTasks.length + 1).toString().padStart(3, '0')}`;
        volunteerTasks.push({
          id: taskId,
          reportId: tempId,
          type: 'xac_minh',
          assignee: null,
          status: 'cho_nhan',
        });
      } else if (openItem.status === 'mo_lai') {
        volunteerTasks.push({
          id: 'NV-004',
          reportId: tempId,
          type: 'nghiem_thu',
          assignee: null,
          status: 'cho_nhan',
        });
      }
    }
  }

  // Sắp xếp 64 hồ sơ theo createdAt tăng dần rồi mới đánh mã TB-0001 -> TB-0064
  reports.sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  const oldToNew = new Map<string, string>();
  for (let idx = 0; idx < reports.length; idx++) {
    const r = reports[idx]!;
    const newId = `TB-${(idx + 1).toString().padStart(4, '0')}`;
    oldToNew.set(r.id, newId);
    r.id = newId;
  }

  // Cập nhật mọi tham chiếu ID trong volunteerTasks
  for (const task of volunteerTasks) {
    if (oldToNew.has(task.reportId)) {
      task.reportId = oldToNew.get(task.reportId)!;
    }
  }

  // Cập nhật mọi tham chiếu ID trong mergedInto, suspectedDuplicateOf và timeline
  for (const r of reports) {
    if (r.mergedInto && oldToNew.has(r.mergedInto)) {
      r.mergedInto = oldToNew.get(r.mergedInto)!;
    }
    if (r.suspectedDuplicateOf && Array.isArray(r.suspectedDuplicateOf)) {
      r.suspectedDuplicateOf = r.suspectedDuplicateOf.map((id) => oldToNew.get(id) || id);
    }
    for (const entry of r.timeline) {
      if (entry.note) {
        for (const [oldId, newId] of oldToNew.entries()) {
          if (entry.note.includes(oldId)) {
            entry.note = entry.note.replaceAll(oldId, newId);
          }
        }
      }
    }
  }

  return { reports, volunteerTasks };
}
