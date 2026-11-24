import { Report } from './types';
import { formatDate } from './format';

/**
 * Tính số ngày chậm hạn công khai theo spec 3.6a (làm tròn lên)
 * Chỉ áp dụng cho các trạng thái: da_tiep_nhan, cho_xac_minh, da_giao, mo_lai
 * Nếu chưa quá hạn hoặc trạng thái khác (như hoan_thanh, dong) -> 0
 */
export function computeDelayDays(report: Report, now: string): number {
  const activeStatuses = ['da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'mo_lai'];
  if (!activeStatuses.includes(report.status)) {
    return 0;
  }

  if (!report.dueAt) {
    return 0;
  }

  const nowMs = new Date(now).getTime();
  const dueMs = new Date(report.dueAt).getTime();

  if (nowMs <= dueMs) {
    return 0;
  }

  const diffMs = nowMs - dueMs;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Tạo câu "Cập nhật mới nhất" theo bảng spec 3.4c + chậm hạn 3.6a
 */
export function formatLatestUpdate(report: Report, now: string): string {
  const delay = computeDelayDays(report, now);
  const delayText = delay > 0 ? ` Việc xử lý đang chậm hơn dự kiến ${delay} ngày.` : '';

  const department = report.department || 'Đơn vị chuyên trách';
  const dueDateStr = report.dueAt ? formatDate(report.dueAt) : '';

  switch (report.status) {
    case 'moi':
      return 'Phường đã nhận phản ánh và sẽ xem xét trong ngày làm việc.';

    case 'da_tiep_nhan': {
      if (dueDateStr) {
        return `Phường đã tiếp nhận, giao ${department}. Dự kiến xong trước ${dueDateStr}.${delayText}`;
      }
      return `Phường đã tiếp nhận, giao ${department}.${delayText}`;
    }

    case 'cho_xac_minh': {
      if (dueDateStr) {
        return `Tình nguyện viên đang kiểm tra tại chỗ. Dự kiến xong trước ${dueDateStr}.${delayText}`;
      }
      return `Tình nguyện viên đang kiểm tra tại chỗ.${delayText}`;
    }

    case 'da_giao':
    case 'mo_lai': {
      if (dueDateStr) {
        return `${department} đang xử lý. Dự kiến xong trước ${dueDateStr}.${delayText}`;
      }
      return `${department} đang xử lý.${delayText}`;
    }

    case 'hoan_thanh': {
      const dateStr = formatDate(report.completedAt || now);
      return `Đã xử lý xong ngày ${dateStr}. Mời bạn xem ảnh kết quả và đánh giá.`;
    }

    case 'dong': {
      const dateStr = formatDate(report.completedAt || now);
      return `Đã xử lý xong ngày ${dateStr}.`;
    }

    case 'can_bo_sung': {
      const lastEntry = [...report.timeline].reverse().find((t) => t.status === 'can_bo_sung');
      const reason = lastEntry?.note || 'cung cấp thêm thông tin';
      return `Phường cần bạn bổ sung: ${reason}.`;
    }

    case 'da_gop': {
      const mainId = report.mergedInto || 'hồ sơ chính';
      return `Phản ánh được gộp vào #${mainId} để xử lý chung.`;
    }

    case 'chuyen_co_quan': {
      const lastEntry = [...report.timeline].reverse().find((t) => t.status === 'chuyen_co_quan');
      let agency = 'cơ quan chuyên trách';
      let reason = 'đúng thẩm quyền xử lý';
      if (lastEntry?.note) {
        const match = lastEntry.note.match(/Chuyển tới ([^:]+):\s*(.*)/);
        if (match && match[1] && match[2]) {
          agency = match[1].trim();
          reason = match[2].trim();
        } else {
          reason = lastEntry.note;
        }
      }
      return `Phản ánh đã được chuyển đến ${agency}: ${reason}.`;
    }

    case 'khong_xac_nhan':
      return 'Khi kiểm tra tại chỗ không thấy sự cố. Bạn có thể gửi lại kèm ảnh mới.';

    default:
      return 'Phản ánh đang được xử lý.';
  }
}
