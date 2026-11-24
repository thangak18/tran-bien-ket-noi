import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CitizenLayout } from '@/layouts/CitizenLayout';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { AppStoreProvider } from '@/store/AppStore';

describe('CT-002 – Layouts (spec 7.1)', () => {
  it('CitizenLayout giới hạn chiều rộng tối đa 430px trên mobile, có NavbarCurve và nút tròn', () => {
    render(
      <AppStoreProvider>
        <MemoryRouter initialEntries={['/']}>
          <CitizenLayout>
            <div>Nội dung người dân</div>
          </CitizenLayout>
        </MemoryRouter>
      </AppStoreProvider>
    );
    const container = screen.getByTestId('citizen-layout-container');
    expect(container.className).toContain('max-w-[430px]');
    expect(screen.getByText('Nội dung người dân')).toBeInTheDocument();

    // Thanh điều hướng đáy NavbarCurve (Phản ánh, Hồ sơ, nút tròn Gửi phản ánh)
    expect(screen.getAllByText('Phản ánh').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hồ sơ').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Gửi phản ánh' })).toBeInTheDocument();
  });

  it('CitizenLayout ẩn thanh điều hướng đáy khi ở route /bao-su-co/*', () => {
    render(
      <AppStoreProvider>
        <MemoryRouter initialEntries={['/bao-su-co/anh']}>
          <CitizenLayout>
            <div>Nội dung bước 1</div>
          </CitizenLayout>
        </MemoryRouter>
      </AppStoreProvider>
    );

    expect(screen.queryByRole('button', { name: 'Gửi phản ánh' })).not.toBeInTheDocument();
  });

  it('VolunteerLayout giới hạn chiều rộng tối đa 430px', () => {
    render(
      <AppStoreProvider>
        <MemoryRouter initialEntries={['/tnv']}>
          <VolunteerLayout>
            <div>Nội dung tình nguyện viên</div>
          </VolunteerLayout>
        </MemoryRouter>
      </AppStoreProvider>
    );
    const container = screen.getByTestId('volunteer-layout-container');
    expect(container.className).toContain('max-w-[430px]');
    expect(screen.getByText('Nội dung tình nguyện viên')).toBeInTheDocument();
  });

  it('OfficerLayout có sidebar desktop', () => {
    render(
      <MemoryRouter initialEntries={['/can-bo']}>
        <OfficerLayout>
          <div>Nội dung cán bộ</div>
        </OfficerLayout>
      </MemoryRouter>
    );
    const sidebar = screen.getByTestId('officer-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(screen.getByText('Nội dung cán bộ')).toBeInTheDocument();
  });
});
