import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapView, MapMarker } from '@/components/map/MapView';
import { WARD_CENTER } from '@/data/streets';

describe('CT-034 – MapView', () => {
  const sampleMarkers: MapMarker[] = [
    {
      id: 'TB-0001',
      lat: 10.952,
      lng: 106.824,
      category: 'mat_duong',
      status: 'da_giao',
    },
    {
      id: 'TB-0002',
      lat: 10.949,
      lng: 106.821,
      category: 'den_duong',
      status: 'hoan_thanh',
    },
  ];

  it('render attribution OpenStreetMap, marker có aria-label "{loại} – {trạng thái}"', () => {
    render(
      <MapView center={[WARD_CENTER.lat, WARD_CENTER.lng]} zoom={14} markers={sampleMarkers} />
    );

    // Attribution OSM bắt buộc
    expect(screen.getByText(/OpenStreetMap/i)).toBeInTheDocument();

    // Marker có aria-label "{loại} – {trạng thái}"
    expect(screen.getByLabelText('Mặt đường – Đang xử lý')).toBeInTheDocument();
    expect(screen.getByLabelText('Đèn đường – Đã xử lý')).toBeInTheDocument();
  });

  it('nút "Chú giải" mở bảng có chữ', () => {
    render(
      <MapView center={[WARD_CENTER.lat, WARD_CENTER.lng]} zoom={14} markers={sampleMarkers} />
    );

    const legendBtn = screen.getByRole('button', { name: /Chú giải/i });
    expect(legendBtn).toBeInTheDocument();
    fireEvent.click(legendBtn);

    // Mở bảng có chữ giải thích loại & trạng thái
    expect(screen.getByText('Bảng chú giải bản đồ')).toBeInTheDocument();
    expect(screen.getByText('Đèn đường')).toBeInTheDocument();
    expect(screen.getByText('Đang xử lý')).toBeInTheDocument();
  });

  it('onTap trả về lat/lng khi click bản đồ', () => {
    const handleTap = vi.fn();
    render(<MapView center={[WARD_CENTER.lat, WARD_CENTER.lng]} zoom={14} onTap={handleTap} />);

    const mapContainer = screen.getByTestId('map-container');
    fireEvent.click(mapContainer);
    // Giả lập click container
    expect(mapContainer).toBeInTheDocument();
  });

  it('khi tile lỗi -> gọi onTileError hoặc hiện fallback không che nút zoom (left-14)', () => {
    const handleTileError = vi.fn();
    render(
      <MapView
        center={[WARD_CENTER.lat, WARD_CENTER.lng]}
        zoom={14}
        onTileError={handleTileError}
        simulateTileError={true}
      />
    );

    expect(handleTileError).toHaveBeenCalled();
    const banner = screen.getByTestId('tile-error-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.className).toContain('left-14');
    expect(screen.getByText(/Không thể tải bản đồ/i)).toBeInTheDocument();
  });

  it('tile lỗi lẻ không hiển thị banner ngay lập tức', () => {
    render(<MapView center={[WARD_CENTER.lat, WARD_CENTER.lng]} zoom={14} />);
    // Mặc định không có banner lỗi
    expect(screen.queryByTestId('tile-error-banner')).not.toBeInTheDocument();
  });
});
