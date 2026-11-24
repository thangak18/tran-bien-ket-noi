import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { StepHeader } from '@/components/common/StepHeader';
import { LocationRow } from '@/components/citizen/LocationRow';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { STREETS, WARD_CENTER, nearestStreet } from '@/data/streets';

export function C03Location() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const photo = state.draft?.photos?.[0] || '/demo-photos/mat_duong/1.jpg';

  const [lat, setLat] = useState<number>(state.draft?.lat || WARD_CENTER.lat);
  const [lng, setLng] = useState<number>(state.draft?.lng || WARD_CENTER.lng);
  const [address, setAddress] = useState<string>(
    state.draft?.address || `Đường ${STREETS[0]!.name}, Phường Trấn Biên`
  );
  const [locationNote, setLocationNote] = useState<string>(state.draft?.locationNote || '');
  const [isChangingStreet, setIsChangingStreet] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('Đã định vị tâm phường');

  useEffect(() => {
    // Thử lấy toạ độ GPS nếu có quyền
    if ('geolocation' in navigator && !state.draft?.address) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setLat(userLat);
          setLng(userLng);
          const nearest = nearestStreet(userLat, userLng);
          setAddress(`Đường ${nearest.name}, Phường Trấn Biên`);
          setGpsStatus('Định vị từ GPS điện thoại');
        },
        () => {
          setGpsStatus('Dùng vị trí trung tâm phường');
        },
        { timeout: 3000 }
      );
    }
  }, [state.draft?.address]);

  const handleSelectStreet = (streetName: string, sLat: number, sLng: number) => {
    setLat(sLat);
    setLng(sLng);
    setAddress(`Đường ${streetName}, Phường Trấn Biên`);
    setIsChangingStreet(false);
  };

  const handleConfirmLocation = () => {
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        lat,
        lng,
        address,
        locationNote,
      },
    });
    navigate('/bao-su-co/xac-nhan');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-8">
      <h1 data-testid="screen-title" className="sr-only">
        Bước 2: Vị trí
      </h1>
      <StepHeader
        currentStep={2}
        title="Vị trí"
        onBack={() => navigate('/bao-su-co/anh')}
        onCancel={() => navigate('/')}
      />

      <main className="flex-1 px-4 py-4 flex flex-col justify-between max-w-md mx-auto w-full">
        <div className="space-y-4">
          {/* Ảnh vừa chụp cao 120px */}
          <div className="relative h-[120px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xs">
            <img
              src={photo}
              alt="Ảnh sự cố"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120"><rect fill="%23e5e7eb" width="400" height="120"/><text fill="%236b7280" font-family="sans-serif" font-size="14" dy="5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh hiện trường</text></svg>';
              }}
            />
            <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
              Ảnh vừa chụp
            </div>
          </div>

          {/* Khối định vị */}
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Chỗ bị hư ở đâu?</h3>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Navigation className="h-3 w-3" /> {gpsStatus}
              </span>
            </div>

            {/* Dòng vị trí với nút đổi */}
            <LocationRow address={address} onChange={() => setIsChangingStreet(true)} />

            {/* Ô nhập số nhà hoặc ghi chú thêm */}
            <div>
              <label
                htmlFor="location-note"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Chi tiết vị trí (không bắt buộc)
              </label>
              <input
                id="location-note"
                type="text"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="Ví dụ: trước số nhà 45, đối diện trường học..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button fullWidth size="lg" onClick={handleConfirmLocation}>
            Đúng chỗ này rồi
          </Button>
        </div>
      </main>

      {/* Sheet chọn đường */}
      <BottomSheet
        isOpen={isChangingStreet}
        onClose={() => setIsChangingStreet(false)}
        title="Chọn tuyến đường tại Phường Trấn Biên"
      >
        <div className="max-h-[60vh] overflow-y-auto py-2 space-y-1">
          {STREETS.map((street) => (
            <button
              key={street.name}
              type="button"
              onClick={() => handleSelectStreet(street.name, street.lat, street.lng)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-primary-50 hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>Đường {street.name}</span>
              </div>
              <span className="text-xs text-gray-400">P. Trấn Biên</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
