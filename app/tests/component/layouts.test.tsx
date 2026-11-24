import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CitizenLayout } from '@/layouts/CitizenLayout';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';

describe('CT-002 – Layouts (spec 7.1)', () => {
  it('CitizenLayout giới hạn chiều rộng tối đa 430px, có thanh điều hướng 5 mục và FAB 64px', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CitizenLayout>
          <div>Nội dung người dân</div>
        </CitizenLayout>
      </MemoryRouter>
    );
    const container = screen.getByTestId('citizen-layout-container');
    expect(container.className).toContain('max-w-[430px]');
    expect(screen.getByText('Nội dung người dân')).toBeInTheDocument();

    // Thanh điều hướng đáy có 5 mục (Trang chủ, Của tôi, FAB Báo sự cố, Bản đồ, Kết quả)
    const nav = screen.getByTestId('citizen-bottom-nav');
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Của tôi')).toBeInTheDocument();
    expect(screen.getByText('Bản đồ')).toBeInTheDocument();
    expect(screen.getByText('Kết quả')).toBeInTheDocument();

    const fab = screen.getByTestId('fab-report');
    expect(fab).toBeInTheDocument();
    expect(fab.className).toContain('h-16');
    expect(fab.className).toContain('w-16');
  });

  it('CitizenLayout ẩn thanh điều hướng đáy khi ở route /bao-su-co/*', () => {
    render(
      <MemoryRouter initialEntries={['/bao-su-co/anh']}>
        <CitizenLayout>
          <div>Nội dung bước 1</div>
        </CitizenLayout>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('citizen-bottom-nav')).not.toBeInTheDocument();
  });

  it('VolunteerLayout giới hạn chiều rộng tối đa 430px', () => {
    render(
      <VolunteerLayout>
        <div>Nội dung tình nguyện viên</div>
      </VolunteerLayout>
    );
    const container = screen.getByTestId('volunteer-layout-container');
    expect(container.className).toContain('max-w-[430px]');
    expect(screen.getByText('Nội dung tình nguyện viên')).toBeInTheDocument();
  });

  it('OfficerLayout có sidebar desktop', () => {
    render(
      <OfficerLayout>
        <div>Nội dung cán bộ</div>
      </OfficerLayout>
    );
    const sidebar = screen.getByTestId('officer-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByText('Nội dung cán bộ')).toBeInTheDocument();
  });
});
