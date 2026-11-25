import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { C02Photo } from '@/screens/citizen/C02Photo';
import { C03Location } from '@/screens/citizen/C03Location';
import { AppStoreProvider, getInitialState, AppState } from '@/store/AppStore';
import * as imageLib from '@/lib/image';
import * as geoLib from '@/lib/geolocation';

vi.mock('@/lib/image', () => ({
  compressImage: vi.fn(),
}));

vi.mock('@/lib/geolocation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/geolocation')>();
  return {
    ...actual,
    getCurrentLocation: vi.fn(),
  };
});

function renderWithStore(ui: React.ReactElement, stateOverride?: Partial<AppState>) {
  const base = getInitialState();
  const initialState: AppState = {
    ...base,
    ...stateOverride,
  };
  return render(
    <MemoryRouter>
      <AppStoreProvider initialState={initialState}>{ui}</AppStoreProvider>
    </MemoryRouter>
  );
}

describe('C02Photo – Bước 1: Chụp ảnh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị StepHeader Bước 1/3, input camera có capture="environment", input thư viện không có capture và tắt nút Tiếp tục khi chưa có ảnh', () => {
    renderWithStore(<C02Photo />);

    expect(screen.getByText(/Bước 1\/3 – Ảnh/)).toBeInTheDocument();
    expect(screen.getByText('Chạm để chụp ảnh')).toBeInTheDocument();
    expect(screen.getByText('Chọn ảnh có sẵn')).toBeInTheDocument();

    const cameraInput = screen.getByTestId('camera-input') as HTMLInputElement;
    const galleryInput = screen.getByTestId('gallery-input') as HTMLInputElement;
    expect(cameraInput.getAttribute('capture')).toBe('environment');
    expect(galleryInput.hasAttribute('capture')).toBe(false);

    const continueBtn = screen.getByRole('button', { name: 'Tiếp tục' });
    expect(continueBtn).toBeDisabled();
  });

  it('báo lỗi khi file vượt quá 15MB hoặc sai định dạng ảnh', async () => {
    renderWithStore(<C02Photo />);

    const galleryInput = screen.getByTestId('gallery-input') as HTMLInputElement;

    const invalidFile = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    fireEvent.change(galleryInput, { target: { files: [invalidFile] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Định dạng tệp không hợp lệ/);
    });

    const oversizedFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 16 * 1024 * 1024 });
    fireEvent.change(galleryInput, { target: { files: [oversizedFile] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/15MB/);
    });
  });

  it('nén ảnh với 1280px JPEG 0.7, hỗ trợ tối đa 5 ảnh, xoá ảnh và hiển thị nhãn Mô phỏng', async () => {
    const mockedCompress = vi.mocked(imageLib.compressImage);
    mockedCompress.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,abc',
      width: 1280,
      height: 720,
    });

    renderWithStore(<C02Photo />);
    const cameraInput = screen.getByTestId('camera-input') as HTMLInputElement;
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.change(cameraInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockedCompress).toHaveBeenCalledWith(file, 1280, 0.7);
      expect(screen.getByText('Ảnh đã chọn (1/5)')).toBeInTheDocument();
    });

    expect(screen.getByText('Mô phỏng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Xoá ảnh 1' }));
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  });

  it('hiện hộp thoại Lưu nháp để gửi sau khi bấm Huỷ lúc đã có ảnh và hiện banner khôi phục khi mở lại', () => {
    renderWithStore(<C02Photo />, {
      draft: { photos: ['data:image/jpeg;base64,existing'] },
    });

    expect(screen.getByRole('region', { name: 'Khôi phục bản nháp' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(screen.getByText('Lưu nháp để gửi sau?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bỏ' })).toBeInTheDocument();
  });
});

describe('C03Location – Bước 2: Vị trí', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị StepHeader Bước 2/3, ảnh 120px, attribution OpenStreetMap và cảnh báo ngoài phường khi GPS > 5km', async () => {
    const mockedGeo = vi.mocked(geoLib.getCurrentLocation);
    mockedGeo.mockResolvedValue({ lat: 10.7769, lng: 106.7009 }); // TP.HCM (>5km)

    renderWithStore(<C03Location />, {
      draft: { photos: ['data:image/jpeg;base64,photo1'] },
    });

    expect(screen.getByText(/Bước 2\/3 – Vị trí/)).toBeInTheDocument();
    expect(screen.getByText('Chỗ bị hư ở đâu?')).toBeInTheDocument();
    expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument();
    expect(screen.getByAltText('Ảnh sự cố đã chụp')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Bạn đang ở ngoài phường Trấn Biên/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Dùng vị trí mẫu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giữ vị trí của tôi' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dùng vị trí mẫu' }));
    expect(screen.queryByText(/Bạn đang ở ngoài phường Trấn Biên/)).not.toBeInTheDocument();
  });

  it('hiển thị fallback nhập tên đường khi GPS bị từ chối hoặc quá thời gian', async () => {
    const mockedGeo = vi.mocked(geoLib.getCurrentLocation);
    mockedGeo.mockRejectedValue(new geoLib.GeolocationError('denied', 'Denied'));

    renderWithStore(<C03Location />, {
      draft: { photos: ['data:image/jpeg;base64,photo1'] },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Chưa lấy được vị trí/);
    });

    const streetInput = screen.getByLabelText('Nhập địa chỉ hoặc tên đường');
    fireEvent.change(streetInput, { target: { value: 'Hưng Đạo' } });

    const optionBtn = screen.getByRole('button', { name: 'Hưng Đạo Vương' });
    fireEvent.click(optionBtn);

    expect(screen.getByText('Hưng Đạo Vương')).toBeInTheDocument();
  });

  it('hỗ trợ chế độ chữ lớn (40% chiều cao bản đồ, nút Tôi đang đứng ở chỗ bị hư) và giới hạn mô tả 120 ký tự', async () => {
    const mockedGeo = vi.mocked(geoLib.getCurrentLocation);
    mockedGeo.mockResolvedValue({ lat: 10.9505, lng: 106.8225 });

    const base = getInitialState();
    renderWithStore(<C03Location />, {
      settings: { ...base.settings, seniorMode: true },
      draft: { photos: ['data:image/jpeg;base64,photo1'] },
    });

    expect(screen.getByRole('button', { name: 'Tôi đang đứng ở chỗ bị hư' })).toBeInTheDocument();

    const mapContainer = screen.getByTestId('map-container').parentElement;
    expect(mapContainer?.className).toContain('h-[40vh]');

    const noteInput = screen.getByLabelText(
      'Mô tả thêm vị trí (không bắt buộc)'
    ) as HTMLInputElement;
    expect(noteInput.maxLength).toBe(120);
  });
});
