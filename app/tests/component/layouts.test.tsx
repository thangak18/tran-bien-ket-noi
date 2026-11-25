import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CitizenLayout } from '@/layouts/CitizenLayout';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';

describe('CT-002 – Layouts (spec 7.1)', () => {
  it('CitizenLayout giới hạn chiều rộng tối đa 430px', () => {
    render(
      <CitizenLayout>
        <div>Nội dung người dân</div>
      </CitizenLayout>
    );
    const container = screen.getByTestId('citizen-layout-container');
    expect(container.className).toContain('max-w-[430px]');
    expect(screen.getByText('Nội dung người dân')).toBeInTheDocument();
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
