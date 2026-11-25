import type { Sql, TransactionSql } from 'postgres';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { canTransition } from '../../src/domain/status';
import { progressStep } from '../../src/domain/constants';
import { getDemoNow } from '../clock';
import type { Status, Role } from '../../src/domain/types';

export interface TransitionActor {
  role: Role; // 'CB' | 'TNV' | 'ND' | 'system'
  actorType: 'citizen' | 'staff' | 'system';
  actorLabel: string;
  staffId?: string | null;
}

export interface TransitionParams {
  note?: string;
  departmentId?: string;
  dueAt?: string | Date;
  resultPhotos?: string[];
  resultNote?: string;
  targetAgency?: string;
  mergedInto?: string;
  statusBeforeMerge?: Status;
  isSupplement?: boolean;
}

export interface ExecuteTransitionOptions {
  reportId: string; // UUID or code (TB-xxxx)
  targetStatus: Status;
  actor: TransitionActor;
  params?: TransitionParams;
  clientVersion?: number;
}

export interface ExecuteTransitionResult {
  report: Record<string, unknown>;
  version: number;
  notificationNeeded: boolean;
}

/**
 * Dịch vụ chuyển trạng thái hồ sơ tập trung với SELECT ... FOR UPDATE và canTransition
 * Đảm bảo tính toàn vẹn dữ liệu, chống xung đột phiên bản (409) và kiểm soát ma trận trạng thái.
 */
export async function executeTransition(
  options: ExecuteTransitionOptions,
  existingTx?: TransactionSql
): Promise<ExecuteTransitionResult> {
  const { reportId, targetStatus, actor, params, clientVersion } = options;
  const now = await getDemoNow();

  // Nếu gọi từ một transaction có sẵn (ví dụ TNV nộp kết quả), dùng lại để mọi thay đổi cùng thành công hoặc cùng huỷ.
  const runInTransaction = <T>(fn: (sql: Sql) => Promise<T>): Promise<T> =>
    existingTx
      ? fn(existingTx as unknown as Sql)
      : (sqlClient.begin((tx) => fn(tx as unknown as Sql)) as Promise<T>);

  return await runInTransaction(async (sql) => {
    // 1. Khóa hàng hồ sơ để đảm bảo tuần tự hóa cập nhật (FOR UPDATE)
    const [report] = await sql`
      SELECT * FROM reports
      WHERE id::text = ${reportId} OR code = ${reportId}
      FOR UPDATE;
    `;

    if (!report) {
      throw new AppError('NOT_FOUND', `Không tìm thấy hồ sơ phản ánh: ${reportId}`, 404);
    }

    const currentStatus = report.status as Status;

    // 2. Kiểm tra xung đột phiên bản (Optimistic Concurrency Control)
    if (clientVersion !== undefined && clientVersion !== report.version) {
      throw new AppError(
        'VERSION_CONFLICT',
        `Xung đột phiên bản: hồ sơ đã được cập nhật bởi thao tác khác (phiên bản trên hệ thống: ${report.version}, phiên bản gửi lên: ${clientVersion})`,
        409
      );
    }

    // 3. Kiểm tra ma trận chuyển trạng thái và phân quyền vai trò.
    //    "Tách" (Spec 3.3): hồ sơ da_gop chỉ được CB đưa về đúng trạng thái trước khi gộp.
    const isSplit =
      currentStatus === 'da_gop' &&
      actor.role === 'CB' &&
      !!report.status_before_merge &&
      targetStatus === report.status_before_merge;
    if (!isSplit && !canTransition(currentStatus, targetStatus, actor.role)) {
      throw new AppError(
        'TRANSITION_NOT_ALLOWED',
        `Không thể chuyển trạng thái từ "${currentStatus}" sang "${targetStatus}" với vai trò ${actor.role}`,
        409
      );
    }

    // 4. Kiểm tra các điều kiện nghiệp vụ bắt buộc theo Spec 3.3
    if (targetStatus === 'hoan_thanh') {
      if (!params?.resultPhotos || params.resultPhotos.length === 0) {
        throw new AppError('BAD_REQUEST', 'Cần có ít nhất 1 hình ảnh kết quả xử lý', 400);
      }
      if (!params?.resultNote || params.resultNote.trim().length < 10) {
        throw new AppError(
          'BAD_REQUEST',
          'Mô tả công việc hoàn thành phải có ít nhất 10 ký tự',
          400
        );
      }
    }

    if (targetStatus === 'can_bo_sung') {
      if (!params?.note || params.note.trim().length < 10) {
        throw new AppError('BAD_REQUEST', 'Cần nhập lý do yêu cầu bổ sung ít nhất 10 ký tự', 400);
      }
    }

    if ((targetStatus as string) === 'chuyen_co_quan_khac' || targetStatus === 'chuyen_co_quan') {
      if (!params?.note || params.note.trim().length < 10) {
        throw new AppError('BAD_REQUEST', 'Cần nhập lý do chuyển cơ quan ít nhất 10 ký tự', 400);
      }
    }

    if (targetStatus === 'da_giao') {
      if (!params?.departmentId) {
        throw new AppError('BAD_REQUEST', 'Thiếu bộ phận xử lý', 400);
      }
      if (!params?.dueAt) {
        throw new AppError('BAD_REQUEST', 'Thiếu thời hạn xử lý (dueAt)', 400);
      }
    }

    if (targetStatus === 'da_gop') {
      if (!params?.mergedInto) {
        throw new AppError('BAD_REQUEST', 'Thiếu mã hồ sơ đích để gộp', 400);
      }
    }

    // 5. Cập nhật bảng reports
    const newVersion = (report.version || 1) + 1;
    const completedAt =
      targetStatus === 'hoan_thanh' || targetStatus === 'dong'
        ? report.completed_at || now
        : targetStatus === 'mo_lai'
          ? null
          : report.completed_at;

    const dueAt = params?.dueAt ? new Date(params.dueAt) : (report.due_at ?? null);
    const deptId =
      params?.departmentId !== undefined ? params.departmentId : (report.department_id ?? null);
    const resultNote =
      params?.resultNote !== undefined ? params.resultNote : (report.result_note ?? null);
    const mergedInto = isSplit
      ? null
      : params?.mergedInto !== undefined
        ? params.mergedInto
        : (report.merged_into ?? null);
    const statusBeforeMerge = isSplit
      ? null
      : targetStatus === 'da_gop'
        ? params?.statusBeforeMerge || currentStatus
        : (report.status_before_merge ?? null);

    await sql`
      UPDATE reports
      SET 
        status = ${targetStatus},
        version = ${newVersion},
        department_id = ${deptId},
        due_at = ${dueAt ? dueAt.toISOString() : null}::timestamptz,
        completed_at = ${completedAt ? new Date(completedAt).toISOString() : null}::timestamptz,
        result_note = ${resultNote},
        merged_into = ${mergedInto ? mergedInto : null}::uuid,
        status_before_merge = ${statusBeforeMerge},
        photos_approved = ${params?.resultPhotos ? true : report.photos_approved}
      WHERE id = ${report.id};
    `;

    // 6. Lưu ảnh kết quả nếu có (kind = 'after')
    if (params?.resultPhotos && params.resultPhotos.length > 0) {
      for (let i = 0; i < params.resultPhotos.length; i++) {
        const photoPath = params.resultPhotos[i];
        if (!photoPath) continue;
        await sql`
          INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
          VALUES (${report.id}, 'after', ${photoPath}, ${i + 1}, 'storage');
        `;
      }
    }

    // 7. Ghi nhận mốc timeline (bất biến)
    const timelineNote =
      params?.note || (params?.resultNote ? `Hoàn thành: ${params.resultNote}` : null);
    await sql`
      INSERT INTO report_timeline (
        report_id, at, status, actor_type, actor_staff_id, actor_label, note
      ) VALUES (
        ${report.id}, ${now}::timestamptz, ${targetStatus}, ${actor.actorType}, 
        ${actor.staffId ? actor.staffId : null}::uuid, ${actor.actorLabel}, ${timelineNote}
      );
    `;

    // 8. Tự động thông báo tới người dân theo dõi
    const prevStep = progressStep(currentStatus);
    const nextStep = progressStep(targetStatus);
    const notificationNeeded = prevStep !== nextStep || targetStatus === 'can_bo_sung';

    if (notificationNeeded) {
      const followers = await sql`
        SELECT phone FROM report_followers WHERE report_id = ${report.id}
        UNION
        SELECT reporter_phone as phone FROM reports WHERE id = ${report.id} AND reporter_phone IS NOT NULL;
      `;

      let notifMsg = `Phản ánh ${report.code} vừa chuyển sang trạng thái: ${targetStatus}`;
      if (targetStatus === 'da_tiep_nhan') notifMsg = `Phản ánh ${report.code} đã được tiếp nhận`;
      else if (targetStatus === 'da_giao')
        notifMsg = `Phản ánh ${report.code} đang được cơ quan chuyên môn xử lý`;
      else if (targetStatus === 'hoan_thanh')
        notifMsg = `Phản ánh ${report.code} đã hoàn thành xử lý. Vui lòng xem kết quả`;
      else if (targetStatus === 'can_bo_sung')
        notifMsg = `Phản ánh ${report.code} cần bổ sung thông tin: ${params?.note || ''}`;

      for (const f of followers) {
        if (f.phone) {
          await sql`
            INSERT INTO notifications (phone, report_id, message, channel, read)
            VALUES (${f.phone}, ${report.id}, ${notifMsg}, 'sms_mo_phong', false);
          `;
        }
      }
    }

    // 9. Lấy lại bản ghi sau khi cập nhật
    const [updated] = await sql`
      SELECT r.*, d.name as department_name, ST_X(r.location::geometry) as lng, ST_Y(r.location::geometry) as lat
      FROM reports r
      LEFT JOIN departments d ON d.id = r.department_id
      WHERE r.id = ${report.id};
    `;

    if (!updated) {
      throw new AppError('INTERNAL_SERVER_ERROR', 'Không thể lấy dữ liệu sau khi cập nhật', 500);
    }

    return {
      report: updated as Record<string, unknown>,
      version: newVersion,
      notificationNeeded,
    };
  });
}
