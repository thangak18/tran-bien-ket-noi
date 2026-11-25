import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

describe('DevUiGallery – /dev/ui', () => {
  it('route /dev/ui render đầy đủ các section component review', async () => {
    render(
      <MemoryRouter initialEntries={['/dev/ui']}>
        <App />
      </MemoryRouter>
    );

    // Kiểm tra tiêu đề header
    expect(await screen.findByText('P3 UI Gallery')).toBeInTheDocument();
    expect(screen.getByText('DEV ONLY')).toBeInTheDocument();

    // Kiểm tra các section chính
    expect(screen.getByText(/1\. StatusChip & DelayChip/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. ProgressBar & Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. BeforeAfter/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. ReportCard/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. LatestUpdate/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. CategoryTile/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. LocationRow & StepHeader/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. MapView/i)).toBeInTheDocument();
    expect(screen.getByText(/9\. TrackingLinkCard & SubscribeCard/i)).toBeInTheDocument();
    expect(screen.getByText(/10\. SmsPreview & MockLabel/i)).toBeInTheDocument();
    expect(screen.getByText(/11\. RatingSheet & BottomSheet Demo/i)).toBeInTheDocument();
  });
});
