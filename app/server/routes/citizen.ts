import { Hono } from 'hono';
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
  recordAnonSubmission,
  recordFailedLookup,
} from '../middleware/rateLimit';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { getDemoNow } from '../clock';
import type { AppEnv } from '../types';

export const citizenRoutes = new Hono<AppEnv>();

/**
 * 1. POST /citizen/otp/request - Yêu cầu mã OTP (Mô phỏng 123456)
 */
citizenRoutes.post('/otp/request', async (c) => {
  const body = await c.req.json();
  const phone = body.phone?.replace(/\s+/g, '');
  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    throw new AppError('INVALID_PHONE', 'Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 0)', 400);
  }

  await checkOtpRateLimit(phone);

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
    throw new AppError('OTP_NOT_FOUND', 'Không tìm thấy yêu cầu OTP cho số điện thoại này. Vui lòng gửi lại.', 400);
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
    throw new AppError(
      'INVALID_OTP',
      `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`,
      400
    );
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
  }

  // Sinh mã bí mật 4 số ngẫu nhiên
  const secretCode = Math.floor(1000 + Math.random() * 9000).toString();
  const secretHash = hashPepper(secretCode);

  // Sinh ownerToken ngẫu nhiên
  const ownerToken = crypto.randomBytes(24).toString('hex');
  const ownerTokenHash = hashPepper(ownerToken);

  // Lấy mã số tiếp theo TB-xxxx
  const [maxRow] = await sqlClient`
    SELECT code FROM reports WHERE code ~ '^TB-[0-9]{4}$' ORDER BY code DESC LIMIT 1;
  `;
  let nextNum = 65;
  if (maxRow?.code) {
    const parsed = parseInt(maxRow.code.replace('TB-', ''), 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  const nextCode = `TB-${nextNum.toString().padStart(4, '0')}`;
  const now = await getDemoNow();

  const pointWkt = `POINT(${lng} ${lat})`;

  const [newReport] = await sqlClient`
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

  if (!newReport) {
    throw new AppError('INTERNAL_SERVER_ERROR', 'Không thể tạo hồ sơ phản ánh', 500);
  }

  // Lưu ảnh
  const photos = Array.isArray(body.photos) ? body.photos : [];
  let sortOrder = 0;
  for (const p of photos) {
    if (typeof p === 'string' && p.trim()) {
      await sqlClient`
        INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
        VALUES (${newReport.id}, 'before', ${p.trim()}, ${sortOrder++}, 'upload');
      `;
    }
  }

  // Lưu timeline khởi tạo
  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_label, note)
    VALUES (
      ${newReport.id}, ${now}::timestamptz, 'moi', 'citizen', 'Người dân',
      'Gửi phản ánh thành công'
    );
  `;

  // Nếu người dân có số điện thoại, ghi nhận follower
  if (!isAnonymous && citizenPhone) {
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${newReport.id}, ${citizenPhone}, 'reporter')
      ON CONFLICT DO NOTHING;
    `;
  }

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
 * 4. GET /citizen/reports/lookup - Tra cứu bằng mã phản ánh + mã bí mật 4 số (Anti-brute force)
 */
citizenRoutes.get('/reports/lookup', async (c) => {
  const code = c.req.query('code')?.trim();
  const secretCode = c.req.query('secretCode')?.trim();
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';

  if (!code || !secretCode) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập mã phản ánh và mã bí mật 4 số', 400);
  }

  await checkLookupRateLimit(code, ip);

  const [report] = await sqlClient`
    SELECT id, code, secret_code_hash, owner_token_hash, anonymous, status
    FROM reports
    WHERE code = ${code} OR id::text = ${code}
    LIMIT 1;
  `;

  if (!report) {
    await recordFailedLookup(code, ip);
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ phản ánh với mã đã cho', 404);
  }

  const expectedHash = hashPepper(secretCode);
  if (expectedHash !== report.secret_code_hash) {
    await recordFailedLookup(code, ip);
    throw new AppError('INVALID_SECRET', 'Mã bí mật 4 số không chính xác', 400);
  }

  // Tra cứu thành công: trả về token sở hữu phiên tra cứu
  const lookupToken = crypto.randomBytes(24).toString('hex');
  const lookupTokenHash = hashPepper(lookupToken);
  await sqlClient`
    UPDATE reports SET owner_token_hash = ${lookupTokenHash} WHERE id = ${report.id};
  `;

  return c.json({
    id: report.code,
    uuid: report.id,
    ownerToken: lookupToken,
    message: 'Tra cứu thành công',
  });
});

/**
 * 5. POST /citizen/reports/:id/claim - Nhận phản ánh ẩn danh vào số điện thoại đã đăng nhập (Spec 4.1)
 */
citizenRoutes.post('/reports/:id/claim', requireCitizenAuth, async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const secretCode = body.secretCode?.trim();
  const citizenPhone = c.get('citizenPhone') as string;

  if (!secretCode) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng cung cấp mã bí mật 4 số để nhận hồ sơ', 400);
  }

  const [report] = await sqlClient`
    SELECT id, code, anonymous, secret_code_hash
    FROM reports
    WHERE code = ${codeOrId} OR id::text = ${codeOrId}
    LIMIT 1;
  `;

  if (!report) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);
  }

  if (hashPepper(secretCode) !== report.secret_code_hash) {
    throw new AppError('INVALID_SECRET', 'Mã bí mật không chính xác', 400);
  }

  // Spec 4.1 Invariant: anonymous giữ true, chỉ đánh dấu subscribed_later = true và thêm vào report_followers
  await sqlClient`
    UPDATE reports SET subscribed_later = true WHERE id = ${report.id};
  `;

  await sqlClient`
    INSERT INTO report_followers (report_id, phone, source)
    VALUES (${report.id}, ${citizenPhone}, 'subscribe_later')
    ON CONFLICT DO NOTHING;
  `;

  return c.json({
    success: true,
    message: 'Đã liên kết hồ sơ vào tài khoản số điện thoại thành công',
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
    throw new AppError('INVALID_STATE', 'Chỉ có thể đánh giá kết quả khi hồ sơ đã ở trạng thái hoàn thành', 400);
  }

  // Lưu feedback
  await sqlClient`
    INSERT INTO feedback (report_id, resolved, rating, tags, comment, at)
    VALUES (${report.id}, ${resolved}, ${rating}, ${sqlClient.json(tags)}, ${comment}, ${now}::timestamptz)
    ON CONFLICT (report_id) DO UPDATE SET
      resolved = EXCLUDED.resolved,
      rating = EXCLUDED.rating,
      tags = EXCLUDED.tags,
      comment = EXCLUDED.comment,
      at = EXCLUDED.at;
  `;

  if (resolved) {
    // Đã giải quyết -> chuyển trạng thái dong
    await sqlClient`
      UPDATE reports SET status = 'dong' WHERE id = ${report.id};
    `;
    await sqlClient`
      INSERT INTO report_timeline (report_id, at, status, actor_type, actor_label, note)
      VALUES (${report.id}, ${now}::timestamptz, 'dong', 'citizen', 'Người dân', 'Đã xác nhận kết quả hài lòng');
    `;
  } else {
    // Chưa giải quyết -> chuyển trạng thái mo_lai và tạo nhiệm vụ nghiệm thu cho TNV (Spec 3.3, 3.4c, DV-012)
    await sqlClient`
      UPDATE reports SET status = 'mo_lai' WHERE id = ${report.id};
    `;
    await sqlClient`
      INSERT INTO report_timeline (report_id, at, status, actor_type, actor_label, note)
      VALUES (${report.id}, ${now}::timestamptz, 'mo_lai', 'citizen', 'Người dân', ${comment || 'Chưa hài lòng với kết quả xử lý, yêu cầu mở lại'});
    `;

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
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT id, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);
  if (report.status !== 'can_bo_sung') {
    throw new AppError('INVALID_STATE', 'Hồ sơ hiện không ở trạng thái cần bổ sung thông tin', 400);
  }

  await sqlClient`
    UPDATE reports SET status = 'da_tiep_nhan' WHERE id = ${report.id};
  `;

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_label, note)
    VALUES (${report.id}, ${now}::timestamptz, 'da_tiep_nhan', 'citizen', 'Người dân', ${note || 'Đã bổ sung thông tin theo yêu cầu'});
  `;

  return c.json({ success: true, newStatus: 'da_tiep_nhan' });
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
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${report.id}, ${citizenPhone}, 'also_me')
      ON CONFLICT DO NOTHING;
    `;
  } else {
    await sqlClient`
      UPDATE reports SET anonymous_follows = anonymous_follows + 1 WHERE id = ${report.id};
    `;
  }

  return c.json({ success: true, message: 'Đã ghi nhận phản ánh của bạn' });
});
