import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportCard } from '@/components/citizen/ReportCard';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { Report } from '@/domain/types';

describe('CT-037b – Fallback cho ảnh thiếu / lỗi trong BeforeAfter và ReportCard', () => {
  const sampleReport: Report = {
    id: 'TB-0001',
    category: 'den_duong',
    photos: [],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: '123 Cách Mạng Tháng Tám',
    createdAt: '2026-11-20T08:00:00+07:00',
    status: 'da_giao',
    priority: 'binh_thuong',
    department: 'Phòng KT-HT&ĐT',
    secretCode: '1234',
    followers: [],
    anonymous: false,
    subscribedLater: false,
    onBehalf: false,
    anonymousFollows: 0,
    timeline: [],
  };

  it('ReportCard khi không có ảnh -> hiển thị ô nền nhạt + icon loại + chữ "Chưa có ảnh"', () => {
    render(<ReportCard report={sampleReport} now="2026-11-24T09:00:00+07:00" />);

    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
  });

  it('ReportCard khi ảnh bị lỗi (trigger onError) -> hiển thị fallback "Chưa có ảnh"', () => {
    const reportWithPhoto: Report = {
      ...sampleReport,
      photos: ['/broken-image.jpg'],
    };
    render(<ReportCard report={reportWithPhoto} now="2026-11-24T09:00:00+07:00" />);

    const img = screen.getByRole('img', { name: /Ảnh phản ánh TB-0001/i });
    fireEvent.error(img);

    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
  });

  it('BeforeAfter khi beforePhotos rỗng -> hiển thị ô nền nhạt + chữ "Chưa có ảnh"', () => {
    render(<BeforeAfter beforePhotos={[]} category="den_duong" />);

    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
  });

  it('BeforeAfter khi ảnh trước lỗi (trigger onError) -> fallback "Chưa có ảnh"', () => {
    render(<BeforeAfter beforePhotos={['/broken-before.jpg']} category="mat_duong" />);

    const beforeImg = screen.getByRole('img', { name: /Trước xử lý/i });
    fireEvent.error(beforeImg);

    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
  });

  it('BeforeAfter khi ảnh sau lỗi (trigger onError) -> fallback "Chưa có ảnh"', () => {
    render(
      <BeforeAfter
        beforePhotos={['/before.jpg']}
        afterPhotos={['/broken-after.jpg']}
        category="ngap_nuoc"
      />
    );

    const afterImg = screen.getByRole('img', { name: /Sau xử lý/i });
    fireEvent.error(afterImg);

    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
  });
});
