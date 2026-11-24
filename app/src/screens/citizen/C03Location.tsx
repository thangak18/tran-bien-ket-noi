import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { MapView, MapMarker } from '@/components/map/MapView';
import { STREETS, WARD_CENTER, nearestStreet } from '@/data/streets';

export function C03Location() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const currentLat = state.draft?.lat || WARD_CENTER.lat;
  const currentLng = state.draft?.lng || WARD_CENTER.lng;
  const currentAddr = state.draft?.address || `Đường ${STREETS[0]!.name}, Phường Trấn Biên`;

  const [lat, setLat] = useState<number>(currentLat);
  const [lng, setLng] = useState<number>(currentLng);
  const [address, setAddress] = useState<string>(currentAddr);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);

  const handleGetGps = () => {
    if ('geolocation' in navigator) {
      setIsGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setLat(uLat);
          setLng(uLng);
          const nearest = nearestStreet(uLat, uLng);
          setAddress(`Đường ${nearest.name}, Phường Trấn Biên`);
          setIsGpsLoading(false);
        },
        () => {
          setIsGpsLoading(false);
          alert('Không thể truy cập GPS. Vui lòng chọn đường từ danh sách bên dưới.');
        },
        { timeout: 4000 }
      );
    }
  };

  const handleSelectStreet = (streetName: string, sLat: number, sLng: number) => {
    setLat(sLat);
    setLng(sLng);
    setAddress(`Đường ${streetName}, Phường Trấn Biên`);
  };

  const handleConfirmLocation = () => {
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        lat,
        lng,
        address,
      },
    });
    navigate('/bao-su-co/xac-nhan');
  };

  // Marker tại vị trí đang chọn
  const markers: MapMarker[] = [
    {
      id: 'current-pinned-loc',
      lat,
      lng,
      category: 'mat_duong',
      status: 'moi',
      title: address,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FB] select-none font-sans">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Bước 2: Vị trí
      </h1>

      {/* Header chung */}
      <header className="z-20 flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
        <button
          type="button"
          onClick={() => navigate('/bao-su-co/xac-nhan')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h2 className="text-sm font-bold text-gray-900">Xác định vị trí phản ánh</h2>

        <div className="w-10" />
      </header>

      {/* BỐ CỤC MOBILE (< 1024px) */}
      <div className="flex flex-1 flex-col lg:hidden">
        {/* Nút viền primary: Lấy vị trí hiện tại (GPS) */}
        <div className="z-10 bg-white px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleGetGps}
            disabled={isGpsLoading}
            className="flex w-full items-center justify-center gap-2 rounded-btn border border-primary bg-white py-2 text-xs font-bold text-primary shadow-soft hover:bg-primary-50 transition-colors"
          >
            <Navigation className={`h-4 w-4 ${isGpsLoading ? 'animate-spin' : ''}`} />
            <span>{isGpsLoading ? 'Đang định vị...' : 'Lấy vị trí hiện tại (GPS)'}</span>
          </button>
        </div>

        {/* Bản đồ lớn */}
        <div className="relative flex-1 min-h-[350px]">
          <MapView center={[lat, lng]} zoom={16} markers={markers} className="h-full w-full" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-1000 rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
            Chạm bản đồ hoặc chọn đường để dời ghim
          </div>
        </div>

        {/* Ô chọn đường & nút xác nhận vị trí */}
        <div className="z-20 rounded-t-[20px] border-t border-[#E5E7EB] bg-white p-4 shadow-2xl space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Tên đường / Địa chỉ gần nhất
            </label>
            <div className="relative">
              <select
                value={STREETS.find((s) => address.includes(s.name))?.name || STREETS[0]!.name}
                onChange={(e) => {
                  const found = STREETS.find((s) => s.name === e.target.value);
                  if (found) handleSelectStreet(found.name, found.lat, found.lng);
                }}
                className="w-full rounded-card border border-[#E5E7EB] bg-gray-50/50 p-2.5 pl-8 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              >
                {STREETS.map((s) => (
                  <option key={s.name} value={s.name}>
                    Đường {s.name}, Phường Trấn Biên
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-primary pointer-events-none" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmLocation}
            className="w-full rounded-btn bg-primary py-3 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all text-center"
          >
            Xác nhận vị trí
          </button>
        </div>
      </div>

      {/* BỐ CỤC DESKTOP (>= 1024px) */}
      <div className="hidden lg:grid grid-cols-12 flex-1 max-w-[1200px] w-full mx-auto p-6 gap-6">
        {/* TRÁI (8/12): Bản đồ lớn */}
        <div className="col-span-8 rounded-card border border-[#E5E7EB] bg-white overflow-hidden shadow-soft flex flex-col">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Bản đồ phường Trấn Biên</span>
            <span>Chạm trên bản đồ hoặc chọn đường để dời điểm ghim</span>
          </div>
          <div className="relative flex-1 min-h-[520px]">
            <MapView center={[lat, lng]} zoom={16} markers={markers} className="h-full w-full" />
          </div>
        </div>

        {/* PHẢI (4/12): Thông tin & Xác nhận */}
        <div className="col-span-4 rounded-card border border-[#E5E7EB] bg-white p-6 shadow-soft flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Vị trí phản ánh</h3>
              <p className="text-xs text-gray-500 mt-1">
                Định vị chính xác điểm xảy ra sự cố để lực lượng chức năng đến tận nơi xử lý.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGetGps}
              disabled={isGpsLoading}
              className="flex w-full items-center justify-center gap-2 rounded-btn border border-primary bg-white py-2.5 text-xs font-bold text-primary shadow-soft hover:bg-primary-50 transition-colors"
            >
              <Navigation className={`h-4 w-4 ${isGpsLoading ? 'animate-spin' : ''}`} />
              <span>{isGpsLoading ? 'Đang định vị...' : 'Lấy vị trí hiện tại (GPS)'}</span>
            </button>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Đường / Địa chỉ gần nhất
              </label>
              <div className="relative">
                <select
                  value={STREETS.find((s) => address.includes(s.name))?.name || STREETS[0]!.name}
                  onChange={(e) => {
                    const found = STREETS.find((s) => s.name === e.target.value);
                    if (found) handleSelectStreet(found.name, found.lat, found.lng);
                  }}
                  className="w-full rounded-card border border-[#E5E7EB] bg-gray-50 p-3 pl-8 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
                >
                  {STREETS.map((s) => (
                    <option key={s.name} value={s.name}>
                      Đường {s.name}, Phường Trấn Biên
                    </option>
                  ))}
                </select>
                <MapPin className="absolute left-2.5 top-3 h-4 w-4 text-primary pointer-events-none" />
              </div>
            </div>

            <div className="rounded-card border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <span className="font-semibold text-gray-900">Toạ độ đã chọn:</span>
              <p className="font-mono text-[11px] text-gray-500">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmLocation}
            className="w-full rounded-btn bg-primary py-3 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all text-center mt-6"
          >
            Xác nhận vị trí này
          </button>
        </div>
      </div>
    </div>
  );
}
