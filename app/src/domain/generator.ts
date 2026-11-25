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

const SAMPLE_DESCRIPTIONS: Record<Category, readonly string[]> = {
  den_duong: [
    'Đèn đường tắt nguyên dãy vào ban đêm',
    'Bóng đèn chiếu sáng chập chờn trước hẻm',
    'Trụ đèn công cộng không sáng nhiều ngày',
    'Đèn đường hỏng gây tối khu vực ngã tư',
    'Dãy đèn cao áp tắt sớm cần kiểm tra',
  ],
  mat_duong: [
    'Ổ gà mặt đường gây nguy hiểm cho xe máy',
    'Kiểm tra chất lượng mặt đường bong tróc',
    'Mặt đường sụt lún đọng nước giữa làn xe',
    'Nắp cống lún sâu so với mặt đường nhựa',
    'Đoạn đường hư hỏng nặng sau đợt mưa lớn',
  ],
  ngap_nuoc: [
    'Ngập nước kéo dài sau mưa lớn chiều qua',
    'Miệng cống thoát nước bị nghẹt gây ứ đọng',
    'Nước rút rất chậm gây trơn trượt mặt đường',
    'Điểm ngập cục bộ cản trở học sinh đi lại',
    'Hệ thống thoát nước tràn lên vỉa hè khu phố',
  ],
  rac_thai: [
    'Không lấy rác sinh hoạt đúng giờ quy định',
    'Mùi hôi quanh bãi rác tự phát đầu hẻm',
    'Rác thải tồn đọng nhiều ngày chưa thu gom',
    'Điểm tập kết rác tràn ra sát mép đường',
    'Xà bần và rác cồng kềnh bỏ ven lề đường',
  ],
};

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
      const idStr = `TB-${reportIdCounter.toString().padStart(4, '0')}`;
      reportIdCounter++;

      const coord = getDispersedCoord();
      const durationDays = durations[durationIndex++]!;
      const durationMs = durationDays * 24 * 60 * 60 * 1000;
      const dayOffset = (durationIndex % 14) + 1; // Ngày 1 -> 14 tháng 11

      // Tìm createdAt (06:00 - 21:00) sao cho completedAt (createdAt + durationMs) rơi vào giờ hành chính (07:00 - 17:30)
      let chosenCreatedMs = 0;
      let chosenCompletedMs = 0;
      for (let h = 7; h <= 20; h++) {
        for (const m of [0, 15, 30, 45]) {
          const cStr = `2026-11-${dayOffset.toString().padStart(2, '0')}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00+07:00`;
          const cMs = new Date(cStr).getTime();
          const compMs = cMs + durationMs;
          if (isOfficeHours(compMs) && isCitizenHours(cMs)) {
            chosenCreatedMs = cMs;
            chosenCompletedMs = compMs;
            break;
          }
        }
        if (chosenCreatedMs) break;
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

      const titles = SAMPLE_DESCRIPTIONS[category];
      const description = titles[(reportIdCounter - 2) % titles.length]!;

      reports.push({
        id: idStr,
        category,
        photos: [`/demo-photos/${category}/${((reportIdCounter % 4) + 1).toString()}.jpg`],
        photosApproved: true,
        lat: coord.lat,
        lng: coord.lng,
        address: `${Math.floor(rand() * 150) + 1} Đ. ${coord.streetName}, P. Trấn Biên`,
        description,
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
      const idStr = `TB-${reportIdCounter.toString().padStart(4, '0')}`;
      reportIdCounter++;

      let lat: number;
      let lng: number;
      let address: string;

      if (openItem.isDemo) {
        // Hồ sơ demo mat_duong: cách tâm phường <= 300m
        lat = WARD_CENTER.lat + 0.0003;
        lng = WARD_CENTER.lng + 0.0003;
        address = '15 Đ. Cách Mạng Tháng Tám, P. Trấn Biên';
      } else if (openItem.cluster === 1) {
        const c1 = cluster1Reports.pop()!;
        lat = c1.lat;
        lng = c1.lng;
        address = '45 Đ. Hưng Đạo Vương, P. Trấn Biên';
      } else if (openItem.cluster === 2) {
        const c2 = cluster2Reports.pop()!;
        lat = c2.lat;
        lng = c2.lng;
        address = '12 Đ. Phan Đình Phùng, P. Trấn Biên';
      } else {
        const coord = getDispersedCoord();
        lat = coord.lat;
        lng = coord.lng;
        address = `${Math.floor(rand() * 120) + 1} Đ. ${coord.streetName}, P. Trấn Biên`;
      }

      // Thời gian tạo: hồ sơ quá hạn chọn ngày sớm để dueAt < demoNow
      let dayOffset: number;
      if (openItem.overdue) {
        dayOffset = category === 'mat_duong' ? 17 : 19;
      } else {
        dayOffset = 23;
      }

      const hour = Math.floor(rand() * 10) + 7; // 07:00 -> 16:00
      const minute = Math.floor(rand() * 50) + 5;
      const createdAt = `2026-11-${dayOffset.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+07:00`;
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

      const openTitles = SAMPLE_DESCRIPTIONS[category];
      const openDescription = openTitles[(reportIdCounter - 2) % openTitles.length]!;

      reports.push({
        id: idStr,
        category,
        photos: [`/demo-photos/${category}/${((reportIdCounter % 4) + 1).toString()}.jpg`],
        photosApproved: true,
        lat,
        lng,
        address,
        description: openDescription,
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
          reportId: idStr,
          type: 'xac_minh',
          assignee: null,
          status: 'cho_nhan',
        });
      } else if (openItem.status === 'mo_lai') {
        volunteerTasks.push({
          id: 'NV-004',
          reportId: idStr,
          type: 'nghiem_thu',
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
