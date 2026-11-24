import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepHeader } from '@/components/common/StepHeader';

describe('CT-033 – StepHeader', () => {
  it('hiện "Bước 2/3 – Vị trí"; ✕ gọi onCancel; ← gọi onBack', () => {
    const handleCancel = vi.fn();
    const handleBack = vi.fn();

    render(<StepHeader currentStep={2} onBack={handleBack} onCancel={handleCancel} />);

    // Tiêu đề bước
    expect(screen.getByText('Bước 2/3 – Vị trí')).toBeInTheDocument();

    // Nút ✕ gọi onCancel
    const cancelBtn = screen.getByLabelText('Huỷ');
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    // Nút ← gọi onBack
    const backBtn = screen.getByLabelText('Quay lại');
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('bước 1 không hiện nút quay lại', () => {
    render(<StepHeader currentStep={1} onCancel={() => {}} />);
    expect(screen.getByText('Bước 1/3 – Chụp ảnh')).toBeInTheDocument();
    expect(screen.queryByLabelText('Quay lại')).not.toBeInTheDocument();
  });
});
