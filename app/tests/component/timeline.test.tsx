import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Timeline } from '@/components/common/Timeline';
import { Report } from '@/domain/types';

describe('CT-032 – ProgressBar và Timeline', () => {
  const sampleReport: Report = {
    id: 'TB-0010',
    category: 'mat_duong',
    photos: [],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: '12 Đường Phan Chu Trinh',
    createdAt: '2026-11-20T08:15:00+07:00',
    status: 'da_giao',
    priority: 'binh_thuong',
    department: 'Phòng KT-HT&ĐT – Đội duy tu đường',
    dueAt: '2026-11-25T17:00:00+07:00',
    secretCode: '1234',
    followers: [],
    anonymous: false,
    subscribedLater: false,
    onBehalf: false,
    anonymousFollows: 0,
    timeline: [
      { at: '2026-11-20T08:15:00+07:00', status: 'moi', actor: 'Người dân' },
      {
        at: '2026-11-20T10:02:00+07:00',
        status: 'da_tiep_nhan',
        actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
      },
      {
        at: '2026-11-21T07:30:00+07:00',
        status: 'da_giao',
        actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
        note: 'Giao Phòng KT-HT&ĐT – Đội duy tu đường',
      },
    ],
  };

  describe('ProgressBar', () => {
    it('render 4 mốc có nhãn, mốc hiện tại có aria-current="step", giờ dưới mốc đã qua', () => {
      render(<ProgressBar report={sampleReport} />);

      // 4 mốc nhãn
      expect(screen.getByText(/Chờ tiếp nhận|Chờ t\.nhận/)).toBeInTheDocument();
      expect(screen.getByText(/Đã tiếp nhận|Đã t\.nhận/)).toBeInTheDocument();
      expect(screen.getByText(/Đang xử lý/)).toBeInTheDocument();
      expect(screen.getByText(/Đã xử lý/)).toBeInTheDocument();

      // Mốc hiện tại (da_giao là bước 3)
      const currentStepEl = screen.getByRole('listitem', { current: 'step' });
      expect(currentStepEl).toBeInTheDocument();
      expect(currentStepEl).toHaveTextContent(/Đang xử lý/);

      // Giờ dưới mốc đã qua (08:15 hoặc 10:02)
      expect(screen.getByText(/08:15/)).toBeInTheDocument();
      expect(screen.getByText(/10:02/)).toBeInTheDocument();
    });
  });

  describe('Timeline', () => {
    it('mốc tương lai có class nhạt + "dự kiến dd/MM"', () => {
      render(<Timeline report={sampleReport} now="2026-11-24T09:00:00+07:00" />);

      // Mốc 4 là tương lai -> có dự kiến 25/11
      expect(screen.getByText(/dự kiến 25\/11/i)).toBeInTheDocument();

      // Kiểm tra có mốc tương lai với class nhạt
      const upcomingEl = screen.getByText(/dự kiến 25\/11/i).closest('.timeline-step');
      expect(upcomingEl).toHaveClass('opacity-60');
    });

    it('hồ sơ da_gop hiện băng ngoại lệ', () => {
      const mergedReport: Report = {
        ...sampleReport,
        status: 'da_gop',
        mergedInto: 'TB-0005',
        timeline: [
          ...sampleReport.timeline,
          {
            at: '2026-11-21T09:00:00+07:00',
            status: 'da_gop',
            actor: 'Cán bộ',
            note: 'Gộp vào hồ sơ TB-0005 do cùng vị trí',
          },
        ],
      };

      render(<Timeline report={mergedReport} now="2026-11-24T09:00:00+07:00" />);

      // Băng ngoại lệ hiển thị
      expect(screen.getByText(/đã được gộp vào hồ sơ TB-0005/i)).toBeInTheDocument();
    });
  });
});
