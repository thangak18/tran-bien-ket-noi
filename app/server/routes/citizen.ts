import { Hono, type Context } from 'hono';
import crypto from 'node:crypto';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import {
  createCitizenToken,
  hashPepper,
  optionalCitizenAuth,
  requireCitizenAuth,
} from '../middleware/auth';
import {
  checkAnonQuota,
  checkLookupRateLimit,
  checkOtpRateLimit,
  checkOtpSendLimit,
  checkPhoneDailyLimit,
  hashIp,
  recordAnonSubmission,
  recordFailedLookup,
  recordOtpSend,
} from '../middleware/rateLimit';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { getDemoNow } from '../clock';
import { executeTransition } from '../services/transition';
import { maskPhone } from '../../src/domain/privacy';
import type { AppEnv } from '../types';

export const citizenRoutes = new Hono<AppEnv>();

/**
 * 1. POST /citizen/otp/request - Yêu cầu mã OTP (Mô phỏng 123456)
 */
citizenRoutes.post('/otp/request', async (c) => {
  const body = await c.req.json();
  const phone = body.phone?.replace(/\s+/g, '');
  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    throw new AppError(
      'INVALID_PHONE',
      'Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 0)',
      400
    );
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  await checkOtpRateLimit(phone);
  await checkOtpSendLimit(phone);
  await recordOtpSend(phone, ip);

  const otpCode = '123456'; // Chuẩn mô phỏng Spec 13.1
  const codeHash = hashPepper(otpCode);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await sqlClient`
    INSERT INTO phone_otps (phone, code_hash, expires_at, attempts)
    VALUES (${phone}, ${codeHash}, ${expiresAt}::timestamptz, 0)
    ON CONFLICT (phone) DO UPDATE SET
      code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      attempts = 0;
  `;

  return c.json({
    success: true,
    message: 'Mã xác thực đã được gửi (Mô phỏng: 123456)',
    simulation: true,
    expiresInSeconds: 300,
  });
});

/**
 * 2. POST /citizen/otp/verify - Xác minh OTP và nhận JWT 30 ngày
 */
citizenRoutes.post('/otp/verify', async (c) => {
  const body = await c.req.json();
  const phone = body.phone?.replace(/\s+/g, '');
  const code = body.code?.trim();

  if (!phone || !code) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập đầy đủ số điện thoại và mã OTP', 400);
  }

  const [otpRecord] = await sqlClient`
    SELECT code_hash, expires_at, attempts
    FROM phone_otps
    WHERE phone = ${phone}
    LIMIT 1;
  `;

  if (!otpRecord) {
    throw new AppError(
      'OTP_NOT_FOUND',
      'Không tìm thấy yêu cầu OTP cho số điện thoại này. Vui lòng gửi lại.',
      400
    );
  }

  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    throw new AppError('OTP_EXPIRED', 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 400);
  }

  const inputHash = hashPepper(code);
  if (inputHash !== otpRecord.code_hash) {
    await sqlClient`
      UPDATE phone_otps SET attempts = attempts + 1 WHERE phone = ${phone};
    `;
    const remaining = Math.max(0, 5 - (otpRecord.attempts + 1));
    throw new AppError('INVALID_OTP', `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`, 400);
  }

  // OTP hợp lệ: xoá OTP đã dùng và cấp token
  await sqlClient`DELETE FROM phone_otps WHERE phone = ${phone};`;
  const token = await createCitizenToken(phone);

  return c.json({
    token,
    phone,
    role: 'citizen',
    expiresIn: '30d',
  });
});

/**
 * 3. POST /citizen/reports - Gửi phản ánh (có Idempotency, hỗ trợ ẩn danh hoặc SĐT)
 */
citizenRoutes.post('/reports', idempotencyMiddleware, optionalCitizenAuth, async (c) => {
  const body = await c.req.json();
  const citizenPhone = c.get('citizenPhone') as string | undefined;

  const category = body.category;
  if (!['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong'].includes(category)) {
    throw new AppError('INVALID_CATEGORY', 'Loại phản ánh không hợp lệ', 400);
  }

  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  if (isNaN(lat) || isNaN(lng) || lat < 10.9 || lat > 11.0 || lng < 106.7 || lng > 106.9) {
    throw new AppError('INVALID_LOCATION', 'Tọa độ vị trí ngoài phạm vi phường Trấn Biên', 400);
  }

  const address = body.address?.trim() || 'Khu vực phường Trấn Biên';
  const description = body.description?.trim() || null;
  const locationNote = body.locationNote?.trim() || null;
  const isAnonymous = body.anonymous === true || !citizenPhone;

  const deviceId = c.req.header('X-Device-Id') || 'web-browser';
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';

  if (isAnonymous) {
    await checkAnonQuota(deviceId, ip);
    await recordAnonSubmission(deviceId, ip);
  } else if (citizenPhone) {
    await checkPhoneDailyLimit(citizenPhone);
  }

  // Sinh mã bí mật 4 số ngẫu nhiên
  const secretCode = Math.floor(1000 + Math.random() * 9000).toString();
  const secretHash = hashPepper(secretCode);

  // Sinh ownerToken ngẫu nhiên
  const ownerToken = crypto.randomBytes(24).toString('hex');
  const ownerTokenHash = hashPepper(ownerToken);
  const now = await getDemoNow();
  const pointWkt = `POINT(${lng} ${lat})`;
  const photos = Array.isArray(body.photos) ? body.photos : [];

  // Tạo hồ sơ trong giao dịch với khoá advisory để đảm bảo mã số TB-xxxx không bao giờ bị trùng lặp khi chạy đồng thời
  const newReport = await sqlClient.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(1001);`;

    const [maxRow] = await tx`
      SELECT code FROM reports WHERE code ~ '^TB-[0-9]{4}$' ORDER BY code DESC LIMIT 1;
    `;
    let nextNum = 65;
    if (maxRow?.code) {
      const parsed = parseInt(maxRow.code.replace('TB-', ''), 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    const nextCode = `TB-${nextNum.toString().padStart(4, '0')}`;

    const [created] = await tx`
      INSERT INTO reports (
        code, category, status, priority, location, address, location_note,
        description, created_at, reporter_phone, anonymous, subscribed_later,
        on_behalf, secret_code_hash, owner_token_hash, anonymous_follows,
        photos_approved, is_seed, version
      ) VALUES (
        ${nextCode}, ${category}, 'moi', 'binh_thuong', ST_GeographyFromText(${pointWkt}),
        ${address}, ${locationNote}, ${description}, ${now}::timestamptz,
        ${isAnonymous ? null : citizenPhone}, ${isAnonymous}, false, false,
        ${secretHash}, ${ownerTokenHash}, 0, true, false, 1
      )
      RETURNING id, code;
    `;

    if (!created) {
      throw new AppError('INTERNAL_SERVER_ERROR', 'Không thể tạo hồ sơ phản ánh', 500);
    }

    // Lưu ảnh
    let sortOrder = 0;
    for (const p of photos) {
      if (typeof p === 'string' && p.trim()) {
        await tx`
          INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
          VALUES (${created.id}, 'before', ${p.trim()}, ${sortOrder++}, 'upload');
        `;
      }
    }

    // Lưu timeline khởi tạo
    await tx`
      INSERT INTO report_timeline (report_id, at, status, actor_type, actor_label, note)
      VALUES (
        ${created.id}, ${now}::timestamptz, 'moi', 'citizen', 'Người dân',
        'Gửi phản ánh thành công'
      );
    `;

    // Nếu người dân có số điện thoại, ghi nhận follower
    if (!isAnonymous && citizenPhone) {
      await tx`
        INSERT INTO report_followers (report_id, phone, source)
        VALUES (${created.id}, ${citizenPhone}, 'reporter')
        ON CONFLICT DO NOTHING;
      `;
    }

    return created;
  });

  return c.json(
    {
      id: newReport.code,
      uuid: newReport.id,
      code: newReport.code,
      secretCode,
      ownerToken: isAnonymous ? ownerToken : undefined,
      message: 'Gửi phản ánh thành công',
    },
    201
  );
});

/**
 * 4. POST /reports/lookup & GET /reports/lookup - Tra cứu bằng mã phản ánh + proof (mã bí mật 4 số HOẶC 4 số cuối SĐT)
 */
const handleLookup = async (c: Context<AppEnv>) => {
  let code: string | undefined;
  let proof: string | undefined;

  if (c.req.method === 'POST') {
    const body = await c.req.json().catch(() => ({}));
    code = (body.code || c.req.query('code'))?.trim();
    proof = (body.proof || body.secretCode || c.req.query('secretCode'))?.trim();
  } else {
    code = c.req.query('code')?.trim();
    proof = (c.req.query('proof') || c.req.query('secretCode'))?.trim();
  }

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';

  if (!code || !proof) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Vui lòng nhập mã phản ánh và mã xác thực (mã bí mật hoặc 4 số cuối SĐT)',
      400
    );
  }

  await checkLookupRateLimit(code, ip);

  const [report] = await sqlClient`
    SELECT id, code, secret_code_hash, owner_token_hash, reporter_phone, anonymous, status
    FROM reports
    WHERE code = ${code} OR id::text = ${code}
    LIMIT 1;
  `;

  if (!report) {
    await recordFailedLookup(code, ip);
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ phản ánh với mã đã cho', 404);
  }

  const secretMatches = hashPepper(proof) === report.secret_code_hash;
  const phoneMatches = Boolean(report.reporter_phone && report.reporter_phone.endsWith(proof));

  if (!secretMatches && !phoneMatches) {
    await recordFailedLookup(code, ip);
    throw new AppError('INVALID_SECRET', 'Mã xác thực không chính xác', 400);
  }

  // Tra cứu thành công: sinh ownerToken mới
  const lookupToken = crypto.randomBytes(24).toString('hex');
  const lookupTokenHash = hashPepper(lookupToken);
  await sqlClient`
    UPDATE reports SET owner_token_hash = ${lookupTokenHash} WHERE id = ${report.id};
  `;

  return c.json({
    id: report.code,
    uuid: report.id,
    code: report.code,
    ownerToken: lookupToken,
    message: 'Tra cứu thành công',
  });
};

citizenRoutes.post('/reports/lookup', handleLookup);
citizenRoutes.get('/reports/lookup', handleLookup);

/**
 * 5. POST /citizen/reports/:id/claim - Nhận phản ánh ẩn danh vào máy qua link ?k= hoặc số điện thoại (Spec 12.3, 13.4)
 */
citizenRoutes.post('/reports/:id/claim', optionalCitizenAuth, async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const secretCode = body.secretCode?.trim();
  const citizenPhone = c.get('citizenPhone') as string | undefined;
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';

  if (!secretCode) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng cung cấp mã bí mật 4 số để nhận hồ sơ', 400);
  }

  await checkLookupRateLimit(codeOrId, ip);

  const [report] = await sqlClient`
    SELECT id, code, anonymous, secret_code_hash
    FROM reports
    WHERE code = ${codeOrId} OR id::text = ${codeOrId}
    LIMIT 1;
  `;

  if (!report) {
    await recordFailedLookup(codeOrId, ip);
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);
  }

  if (hashPepper(secretCode) !== report.secret_code_hash) {
    await recordFailedLookup(codeOrId, ip);
    throw new AppError('INVALID_SECRET', 'Mã bí mật không chính xác', 400);
  }

  // Cấp ownerToken
  const ownerToken = crypto.randomBytes(24).toString('hex');
  const ownerTokenHash = hashPepper(ownerToken);
  await sqlClient`
    UPDATE reports SET owner_token_hash = ${ownerTokenHash} WHERE id = ${report.id};
  `;

  // Nếu người dân đã đăng nhập SĐT, liên kết vào report_followers
  if (citizenPhone) {
    await sqlClient`UPDATE reports SET subscribed_later = true WHERE id = ${report.id};`;
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${report.id}, ${citizenPhone}, 'subscribe_later')
      ON CONFLICT DO NOTHING;
    `;
  }

  return c.json({
    success: true,
    id: report.code,
    code: report.code,
    ownerToken,
    message: 'Xác thực chủ hồ sơ thành công',
  });
});

/**
 * 6. POST /citizen/reports/:id/feedback - Đánh giá kết quả xử lý (Hài lòng -> đóng, Chưa -> mở lại & tạo task TNV)
 */
citizenRoutes.post('/reports/:id/feedback', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const resolved = Boolean(body.resolved);
  const rating = body.rating ? parseInt(body.rating, 10) : null;
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const comment = body.comment?.trim() || null;
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT id, code, status, category, address
    FROM reports
    WHERE code = ${codeOrId} OR id::text = ${codeOrId}
    LIMIT 1;
  `;

  if (!report) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ phản ánh', 404);
  }

  if (report.status !== 'hoan_thanh' && report.status !== 'dong') {
    throw new AppError(
      'INVALID_STATE',
      'Chỉ có thể đánh giá kết quả khi hồ sơ đã ở trạng thái hoàn thành',
      400
    );
  }

  // Kiểm tra xem đã có đánh giá chưa (tối đa 1 lần/phản ánh - L7)
  const [existingFeedback] = await sqlClient`
    SELECT report_id FROM feedback WHERE report_id = ${report.id} LIMIT 1;
  `;
  if (existingFeedback) {
    throw new AppError('ALREADY_RATED', 'Phản ánh này đã được đánh giá, không thể gửi lại', 400);
  }

  // Lưu feedback
  await sqlClient`
    INSERT INTO feedback (report_id, resolved, rating, tags, comment, at)
    VALUES (${report.id}, ${resolved}, ${rating}, ${JSON.stringify(tags)}::jsonb, ${comment}, ${now}::timestamptz);
  `;

  if (resolved) {
    // Đã giải quyết -> chuyển trạng thái dong
    await executeTransition({
      reportId: report.id,
      targetStatus: 'dong',
      actor: {
        role: 'system',
        actorType: 'citizen',
        actorLabel: 'Người dân',
      },
      params: { note: 'Đã xác nhận kết quả hài lòng' },
    });
  } else {
    // Chưa giải quyết -> chuyển trạng thái mo_lai và tạo nhiệm vụ nghiệm thu cho TNV (Spec 3.3, 3.4c, DV-012)
    await executeTransition({
      reportId: report.id,
      targetStatus: 'mo_lai',
      actor: {
        role: 'system',
        actorType: 'citizen',
        actorLabel: 'Người dân',
      },
      params: { note: comment || 'Chưa hài lòng với kết quả xử lý, yêu cầu mở lại' },
    });

    // Tạo Volunteer Task nghiệm thu
    const [maxTask] = await sqlClient`
      SELECT code FROM volunteer_tasks WHERE code ~ '^NV-[0-9]{3}$' ORDER BY code DESC LIMIT 1;
    `;
    let nextNum = 5;
    if (maxTask?.code) {
      const p = parseInt(maxTask.code.replace('NV-', ''), 10);
      if (!isNaN(p)) nextNum = p + 1;
    }
    const taskCode = `NV-${nextNum.toString().padStart(3, '0')}`;

    await sqlClient`
      INSERT INTO volunteer_tasks (code, report_id, type, status)
      VALUES (${taskCode}, ${report.id}, 'nghiem_thu', 'cho_nhan');
    `;
  }

  return c.json({
    success: true,
    resolved,
    newStatus: resolved ? 'dong' : 'mo_lai',
  });
});

/**
 * 7. POST /citizen/reports/:id/supplement - Bổ sung thông tin khi hồ sơ ở trạng thái can_bo_sung
 */
citizenRoutes.post('/reports/:id/supplement', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const note = body.note?.trim();

  const [report] = await sqlClient`
    SELECT id, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  const result = await executeTransition({
    reportId: report.id,
    targetStatus: 'moi',
    actor: {
      role: 'ND',
      actorType: 'citizen',
      actorLabel: 'Người dân',
    },
    params: { note: note || 'Đã bổ sung thông tin theo yêu cầu' },
    clientVersion: body.version,
  });

  return c.json({ success: true, newStatus: result.report.status, version: result.version });
});

/**
 * 8. POST /citizen/reports/:id/follow - Theo dõi phản ánh (Tôi cũng gặp)
 */
citizenRoutes.post('/reports/:id/follow', optionalCitizenAuth, async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const citizenPhone = (c.get('citizenPhone') as string) || body.phone?.replace(/\s+/g, '');

  const [report] = await sqlClient`
    SELECT id, anonymous_follows FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  if (citizenPhone && /^0[0-9]{9}$/.test(citizenPhone)) {
    const [existing] = await sqlClient`
      SELECT 1 FROM report_followers WHERE report_id = ${report.id} AND phone = ${citizenPhone} LIMIT 1;
    `;
    if (existing) {
      throw new AppError('ALREADY_FOLLOWED', 'Số điện thoại này đã theo dõi phản ánh này rồi', 400);
    }
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${report.id}, ${citizenPhone}, 'also_me');
    `;
  } else {
    const deviceId = c.req.header('X-Device-Id') || 'web-browser';
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
    const anonIdentifier = 'anon:' + hashIp(deviceId + ':' + ip);
    const [existing] = await sqlClient`
      SELECT 1 FROM report_followers WHERE report_id = ${report.id} AND phone = ${anonIdentifier} LIMIT 1;
    `;
    if (existing) {
      throw new AppError(
        'ALREADY_FOLLOWED',
        'Thiết bị hoặc IP này đã theo dõi phản ánh này rồi',
        400
      );
    }
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${report.id}, ${anonIdentifier}, 'also_me');
    `;
    await sqlClient`
      UPDATE reports SET anonymous_follows = anonymous_follows + 1 WHERE id = ${report.id};
    `;
  }

  return c.json({ success: true, message: 'Đã ghi nhận phản ánh của bạn' });
});

/**
 * 9. GET /me/reports - Danh sách phản ánh của người dân đã đăng nhập SĐT (Spec 12.3, AC-C05)
 */
citizenRoutes.get('/me/reports', requireCitizenAuth, async (c) => {
  const citizenPhone = c.get('citizenPhone') as string;

  const rows = await sqlClient`
    SELECT DISTINCT
      r.id, r.code, r.category, r.status, r.address, r.location_note,
      r.description, r.created_at, r.due_at, r.priority, r.anonymous,
      r.subscribed_later, r.completed_at, r.result_note,
      ST_X(r.location::geometry) as lng, ST_Y(r.location::geometry) as lat,
      d.name as department_name,
      (SELECT count(*)::int FROM report_followers f WHERE f.report_id = r.id) as follower_count
    FROM reports r
    LEFT JOIN departments d ON d.id = r.department_id
    LEFT JOIN report_followers rf ON rf.report_id = r.id
    WHERE r.reporter_phone = ${citizenPhone} OR rf.phone = ${citizenPhone}
    ORDER BY r.created_at DESC;
  `;

  const reportIds = rows.map((r) => r.id);
  const photosByReport: Record<string, string[]> = {};
  if (reportIds.length > 0) {
    const photos = await sqlClient`
      SELECT report_id, storage_path, kind FROM report_photos
      WHERE report_id = ANY(${reportIds}) ORDER BY sort ASC;
    `;
    for (const p of photos) {
      if (!photosByReport[p.report_id]) photosByReport[p.report_id] = [];
      photosByReport[p.report_id]!.push(p.storage_path);
    }
  }

  const items = rows.map((r) => ({
    id: r.code,
    uuid: r.id,
    code: r.code,
    category: r.category,
    status: r.status,
    address: r.address,
    locationNote: r.location_note,
    description: r.description,
    lat: Number(r.lat),
    lng: Number(r.lng),
    createdAt: r.created_at,
    dueAt: r.due_at,
    priority: r.priority,
    department: r.department_name,
    followerCount: Number(r.follower_count || 1),
    anonymous: r.anonymous,
    subscribedLater: r.subscribed_later,
    photos: photosByReport[r.id] || [],
    resultNote: r.result_note,
    completedAt: r.completed_at,
  }));

  return c.json({ items });
});

/**
 * 10. GET /reports/:code/owner - Chi tiết C06 đầy đủ cho chủ hồ sơ (Spec 12.3, 13.4, AC-C06-11)
 */
citizenRoutes.get('/reports/:code/owner', optionalCitizenAuth, async (c) => {
  const code = c.req.param('code');
  const reportKey = c.req.header('X-Report-Key')?.trim();
  const citizenPhone = c.get('citizenPhone') as string | undefined;

  const [report] = await sqlClient`
    SELECT 
      r.*,
      d.name as department_name,
      ST_X(r.location::geometry) as lng,
      ST_Y(r.location::geometry) as lat,
      (SELECT count(*)::int FROM report_followers f WHERE f.report_id = r.id) as follower_count,
      fb.resolved as feedback_resolved,
      fb.rating as feedback_rating,
      fb.tags as feedback_tags,
      fb.comment as feedback_comment,
      fb.at as feedback_at
    FROM reports r
    LEFT JOIN departments d ON d.id = r.department_id
    LEFT JOIN feedback fb ON fb.report_id = r.id
    WHERE r.code = ${code} OR r.id::text = ${code}
    LIMIT 1;
  `;

  if (!report) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ phản ánh', 404);
  }

  // Xác thực quyền chủ hồ sơ:
  // (a) X-Report-Key khớp owner_token_hash
  // (b) citizenPhone khớp reporter_phone hoặc nằm trong report_followers
  let isOwner = false;
  if (reportKey && hashPepper(reportKey) === report.owner_token_hash) {
    isOwner = true;
  } else if (citizenPhone) {
    if (report.reporter_phone === citizenPhone) {
      isOwner = true;
    } else {
      const [follower] = await sqlClient`
        SELECT 1 FROM report_followers WHERE report_id = ${report.id} AND phone = ${citizenPhone} LIMIT 1;
      `;
      if (follower) isOwner = true;
    }
  }

  if (!isOwner) {
    throw new AppError('FORBIDDEN', 'Bạn không có quyền quản lý hồ sơ này', 403);
  }

  // Lấy ảnh trước & sau
  const photos = await sqlClient`
    SELECT storage_path, kind FROM report_photos WHERE report_id = ${report.id} ORDER BY sort ASC;
  `;
  const beforePhotos = photos.filter((p) => p.kind === 'before').map((p) => p.storage_path);
  const afterPhotos = photos.filter((p) => p.kind === 'after').map((p) => p.storage_path);

  // Lấy timeline
  const timeline = await sqlClient`
    SELECT at, status, actor_label, note
    FROM report_timeline
    WHERE report_id = ${report.id}
    ORDER BY at ASC;
  `;

  return c.json({
    id: report.code,
    uuid: report.id,
    code: report.code,
    category: report.category,
    status: report.status,
    priority: report.priority,
    department: report.department_name,
    address: report.address,
    locationNote: report.location_note,
    description: report.description,
    lat: Number(report.lat),
    lng: Number(report.lng),
    createdAt: report.created_at,
    dueAt: report.due_at,
    completedAt: report.completed_at,
    photos: beforePhotos,
    resultPhotos: afterPhotos,
    resultNote: report.result_note,
    followerCount: Number(report.follower_count || 1) + Number(report.anonymous_follows || 0),
    anonymous: report.anonymous,
    subscribedLater: report.subscribed_later,
    reporterPhone: report.reporter_phone || undefined,
    maskedPhone: report.reporter_phone ? maskPhone(report.reporter_phone) : undefined,
    timeline: timeline.map((t) => ({
      at: t.at,
      status: t.status,
      actor: t.actor_label,
      note: t.note,
    })),
    feedback:
      report.feedback_resolved != null
        ? {
            resolved: report.feedback_resolved,
            rating: report.feedback_rating,
            tags: report.feedback_tags,
            comment: report.feedback_comment,
            at: report.feedback_at,
          }
        : undefined,
    canFeedback: ['hoan_thanh', 'dong'].includes(report.status),
    canSupplement: report.status === 'can_bo_sung',
    isOwner: true,
  });
});

/**
 * 11. POST & DELETE /reports/:code/subscribe - Đăng ký / huỷ nhận tin cho hồ sơ ẩn danh (AC-C06-9)
 */
citizenRoutes.post('/reports/:code/subscribe', optionalCitizenAuth, async (c) => {
  const code = c.req.param('code');
  const body = await c.req.json().catch(() => ({}));
  const phone = (c.get('citizenPhone') as string) || body.phone?.replace(/\s+/g, '');
  const reportKey = c.req.header('X-Report-Key')?.trim();

  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    throw new AppError(
      'INVALID_PHONE',
      'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)',
      400
    );
  }

  const [report] = await sqlClient`
    SELECT id, code, owner_token_hash FROM reports WHERE code = ${code} OR id::text = ${code} LIMIT 1;
  `;
  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  if (reportKey && hashPepper(reportKey) !== report.owner_token_hash) {
    throw new AppError('FORBIDDEN', 'Khoá hồ sơ không hợp lệ', 403);
  }

  await sqlClient`UPDATE reports SET subscribed_later = true WHERE id = ${report.id};`;
  await sqlClient`
    INSERT INTO report_followers (report_id, phone, source)
    VALUES (${report.id}, ${phone}, 'subscribe_later')
    ON CONFLICT DO NOTHING;
  `;

  return c.json({ success: true, message: 'Đăng ký nhận thông báo thành công' });
});

citizenRoutes.delete('/reports/:code/subscribe', optionalCitizenAuth, async (c) => {
  const code = c.req.param('code');
  const phone = (c.get('citizenPhone') as string) || c.req.query('phone')?.replace(/\s+/g, '');

  if (!phone) {
    throw new AppError('INVALID_PHONE', 'Thiếu số điện thoại', 400);
  }

  const [report] = await sqlClient`
    SELECT id FROM reports WHERE code = ${code} OR id::text = ${code} LIMIT 1;
  `;
  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  await sqlClient`
    DELETE FROM report_followers WHERE report_id = ${report.id} AND phone = ${phone};
  `;

  return c.json({ success: true, message: 'Đã huỷ nhận thông báo' });
});

/**
 * 12. GET /me/notifications & POST /me/notifications/read - Thông báo của người dân (AC-C05-5)
 */
const handleGetNotifications = async (c: Context<AppEnv>) => {
  const citizenPhone = c.get('citizenPhone') as string;
  const items = await sqlClient`
    SELECT n.id, n.phone, n.report_id, n.message, n.channel, n.read, n.created_at,
           r.code as report_code
    FROM notifications n
    LEFT JOIN reports r ON r.id = n.report_id
    WHERE n.phone = ${citizenPhone}
    ORDER BY n.created_at DESC
    LIMIT 50;
  `;
  return c.json({ items });
};

citizenRoutes.get('/me/notifications', requireCitizenAuth, handleGetNotifications);
citizenRoutes.get('/notifications', requireCitizenAuth, handleGetNotifications);

citizenRoutes.post('/me/notifications/read', requireCitizenAuth, async (c) => {
  const citizenPhone = c.get('citizenPhone') as string;
  const body = await c.req.json().catch(() => ({}));
  const id = body.id;
  if (id) {
    await sqlClient`UPDATE notifications SET read = true WHERE id = ${id} AND phone = ${citizenPhone};`;
  } else {
    await sqlClient`UPDATE notifications SET read = true WHERE phone = ${citizenPhone};`;
  }
  return c.json({ success: true });
});

citizenRoutes.post('/notifications/:id/read', requireCitizenAuth, async (c) => {
  const id = c.req.param('id');
  const citizenPhone = c.get('citizenPhone') as string;
  await sqlClient`UPDATE notifications SET read = true WHERE id = ${id} AND phone = ${citizenPhone};`;
  return c.json({ success: true });
});
