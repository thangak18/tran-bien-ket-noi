import { Report, VolunteerTask, Category, Status } from './types';
import { STREETS, WARD_CENTER } from '../data/streets';
import { FEEDBACK_POSITIVE_TAGS, FEEDBACK_NEGATIVE_TAGS } from './constants';

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
 * Sinh bộ dữ liệu mẫu 64 phản ánh và 3 nhiệm vụ tình nguyện viên (spec 5, DV-001 -> DV-014)
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
      const idStr = `TB-${reportIdCounter.toString().padStart(4, '0')}`;
      reportIdCounter++;

      const coord = getDispersedCoord();
      const dayOffset = Math.floor(rand() * 14) + 1; // Ngày 1 -> 15 tháng 11
      const hour = Math.floor(rand() * 10) + 8;
      const minute = Math.floor(rand() * 50) + 10;
      const createdAt = `2026-11-${dayOffset.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+07:00`;

      const durationDays = durations[durationIndex++]!;
      const createdMs = new Date(createdAt).getTime();
      const completedMs = createdMs + durationDays * 24 * 60 * 60 * 1000;
      const completedAt = new Date(completedMs).toISOString();

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

      reports.push({
        id: idStr,
        category,
        photos: [`/demo-photos/${category}/${((reportIdCounter % 4) + 1).toString()}.jpg`],
        photosApproved: true,
        lat: coord.lat,
        lng: coord.lng,
        address: `${Math.floor(rand() * 150) + 1} Đường ${coord.streetName}`,
        createdAt,
        status: item.status,
        priority: 'binh_thuong',
        department: 'Phòng KT-HT&ĐT',
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
              at: completedAt,
            }
          : undefined,
        timeline: [
          { at: createdAt, status: 'moi', actor: 'Người dân' },
          { at: completedAt, status: item.status, actor: 'Phường Trấn Biên' },
        ],
      });
    }

    // B. Tạo hồ sơ chưa hoàn tất (mở)
    for (const openItem of open) {
      const idStr = `TB-${reportIdCounter.toString().padStart(4, '0')}`;
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

      // Thời gian tạo: từ ngày 16 đến ngày 23/11/2026
      const dayOffset = Math.floor(rand() * 7) + 16;
      const createdAt = `2026-11-${dayOffset.toString().padStart(2, '0')}T09:00:00+07:00`;

      let dueAt: string | undefined = undefined;
      if (openItem.status === 'da_giao') {
        if (openItem.overdue) {
          // Quá hạn: do hạn trước demoNow (24/11 09:00)
          dueAt = '2026-11-23T08:00:00+07:00';
        } else {
          // Còn hạn: hạn sau demoNow
          dueAt = '2026-11-26T17:00:00+07:00';
        }
      } else if (openItem.status === 'da_tiep_nhan') {
        dueAt = '2026-11-27T17:00:00+07:00';
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
        id: idStr,
        category,
        photos: [`/demo-photos/${category}/1.jpg`],
        photosApproved: true,
        lat,
        lng,
        address,
        createdAt,
        status: openItem.status,
        priority: openItem.isDemo ? 'binh_thuong' : 'binh_thuong',
        department: 'Phòng KT-HT&ĐT',
        dueAt,
        reporterPhone: isAnon ? undefined : '0909000068',
        anonymous: isAnon,
        subscribedLater: isSubscribed,
        secretCode,
        onBehalf: false,
        followers,
        anonymousFollows: isAnon && !isSubscribed ? 1 : 0,
        timeline: [{ at: createdAt, status: 'moi', actor: 'Người dân' }],
      });

      // Nếu trạng thái là cho_xac_minh -> sinh VolunteerTask
      if (openItem.status === 'cho_xac_minh') {
        const taskId = `NV-${(volunteerTasks.length + 1).toString().padStart(3, '0')}`;
        volunteerTasks.push({
          id: taskId,
          reportId: idStr,
          type: 'xac_minh',
          assignee: null,
          status: 'cho_nhan',
        });
      }
    }
  }

  // Sắp xếp lại theo id từ TB-0001 đến TB-0064
  reports.sort((a, b) => a.id.localeCompare(b.id));

  return { reports, volunteerTasks };
}
