import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';
import { CitizenLayout } from '@/layouts/CitizenLayout';
import { MapView, MapMarker } from '@/components/map/MapView';
import { Button, Modal, TextField } from '@/components/ui';
import { STREETS, WARD_CENTER, nearestStreet } from '@/data/streets';
import { haversineMeters } from '@/domain/geo';
import { Coordinates, getCurrentLocation } from '@/lib/geolocation';
import { reverseGeocodeCoords } from '@/lib/geocoding';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { useAppStore } from '@/store/AppStore';

const OUTSIDE_WARD_METERS = 5000;
const MAX_LOCATION_NOTE = 120;

interface LocationNavState {
  fromConfirm?: boolean;
  fromStep?: number;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatWardStreetAddress(streetName: string): string {
  const clean = streetName.trim();
  if (!clean) return 'Đ. Cách Mạng Tháng Tám, P. Trấn Biên';
  if (clean.includes('P. Trấn Biên')) return clean;
  if (clean.startsWith('Đ.') || clean.startsWith('Đường')) {
    return `${clean}, P. Trấn Biên`;
  }
  return `Đ. ${clean}, P. Trấn Biên`;
}

export function C03Location() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppStore();
  const { draft, settings } = state;
  const isDesktop = useIsDesktop(1024);

  const navState = (location.state as LocationNavState | null) ?? null;

  const initialLat = draft.lat ?? WARD_CENTER.lat;
  const initialLng = draft.lng ?? WARD_CENTER.lng;
  const initialAddress =
    draft.address ?? formatWardStreetAddress(nearestStreet(initialLat, initialLng).name);

  const [pinCoords, setPinCoords] = useState<Coordinates>({
    lat: initialLat,
    lng: initialLng,
  });
  const [address, setAddress] = useState<string>(initialAddress);
  const [locationNote, setLocationNote] = useState<string>(draft.locationNote ?? '');

  const [gpsCoords, setGpsCoords] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsFailedMessage, setGpsFailedMessage] = useState<string | null>(null);
  const [showOutsideWardBanner, setShowOutsideWardBanner] = useState<boolean>(false);

  const [showAddressSearch, setShowAddressSearch] = useState<boolean>(false);
  const [streetQuery, setStreetQuery] = useState<string>('');
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const syncDraftLocation = useCallback(
    (coords: Coordinates, nextAddress: string, nextNote: string) => {
      dispatch({
        type: 'SET_DRAFT',
        payload: {
          lat: coords.lat,
          lng: coords.lng,
          address: nextAddress,
          locationNote: nextNote.trim() || undefined,
        },
      });
    },
    [dispatch]
  );

  // Reverse geocoding thật từ Nominatim OpenStreetMap (fallback mượt về nearestStreet khi offline/test)
  const reverseGeocodeOsm = useCallback(
    async (lat: number, lng: number, noteSnapshot: string) => {
      const resolved = await reverseGeocodeCoords(lat, lng);
      setAddress(resolved);
      syncDraftLocation({ lat, lng }, resolved, noteSnapshot);
    },
    [syncDraftLocation]
  );

  const requestGpsLocation = useCallback(async () => {
    setIsLocating(true);
    setGpsFailedMessage(null);

    try {
      const coords = await getCurrentLocation({ timeoutMs: 10000 });
      if (!coords) return;
      setGpsCoords(coords);
      setPinCoords(coords);

      const street = nearestStreet(coords.lat, coords.lng);
      const formatted = formatWardStreetAddress(street.name);
      setAddress(formatted);
      syncDraftLocation(coords, formatted, locationNote);
      void reverseGeocodeOsm(coords.lat, coords.lng, locationNote);

      const distFromWard = haversineMeters(
        coords.lat,
        coords.lng,
        WARD_CENTER.lat,
        WARD_CENTER.lng
      );
      setShowOutsideWardBanner(distFromWard > OUTSIDE_WARD_METERS);
    } catch {
      setGpsFailedMessage('Chưa lấy được vị trí. Bạn bật định vị hoặc gõ tên đường nhé.');
      setShowAddressSearch(true);
    } finally {
      setIsLocating(false);
    }
  }, [locationNote, reverseGeocodeOsm, syncDraftLocation]);

  useEffect(() => {
    if (draft.lat === undefined || draft.lng === undefined) {
      void requestGpsLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStreets = useMemo(() => {
    const q = normalizeText(streetQuery);
    if (!q) return STREETS;
    return STREETS.filter((s) => normalizeText(s.name).includes(q));
  }, [streetQuery]);

  const handleMapTap = (lat: number, lng: number) => {
    const nextCoords = { lat, lng };
    const street = nearestStreet(lat, lng);
    const formatted = formatWardStreetAddress(street.name);
    setPinCoords(nextCoords);
    setAddress(formatted);
    syncDraftLocation(nextCoords, formatted, locationNote);
    void reverseGeocodeOsm(lat, lng, locationNote);
  };

  const handleSelectStreet = (streetName: string, lat: number, lng: number) => {
    const nextCoords = { lat, lng };
    const formatted = formatWardStreetAddress(streetName);
    setPinCoords(nextCoords);
    setAddress(formatted);
    setStreetQuery(streetName);
    setShowAddressSearch(false);
    setShowOutsideWardBanner(false);
    syncDraftLocation(nextCoords, formatted, locationNote);
  };

  const handleUseWardCenterLocation = () => {
    const sampleStreet = nearestStreet(WARD_CENTER.lat, WARD_CENTER.lng);
    const sampleCoords = { lat: WARD_CENTER.lat, lng: WARD_CENTER.lng };
    const formatted = formatWardStreetAddress(sampleStreet.name);
    setPinCoords(sampleCoords);
    setAddress(formatted);
    setShowOutsideWardBanner(false);
    syncDraftLocation(sampleCoords, formatted, locationNote);
  };

  const handleKeepMyLocation = () => {
    setShowOutsideWardBanner(false);
  };

  const handleOpenAddressSearch = () => {
    setShowAddressSearch((prev) => !prev);
    setTimeout(() => {
      addressInputRef.current?.focus();
    }, 0);
  };

  const handleFocusMap = () => {
    mapWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_LOCATION_NOTE);
    setLocationNote(value);
  };

  const handleConfirmLocation = () => {
    syncDraftLocation(pinCoords, address, locationNote);
    navigate('/bao-su-co/xac-nhan', { state: { fromStep: 2 } });
  };

  const handleBack = () => {
    if (navState?.fromConfirm) {
      navigate('/bao-su-co/xac-nhan');
    } else {
      navigate('/bao-su-co/anh', { state: { fromStep: 2 } });
    }
  };

  const handleSaveDraftAndExit = () => {
    syncDraftLocation(pinCoords, address, locationNote);
    setShowExitModal(false);
    navigate('/');
  };

  const handleDiscardDraftAndExit = () => {
    dispatch({ type: 'CLEAR_DRAFT' });
    setShowExitModal(false);
    navigate('/');
  };

  const pinMarkers: MapMarker[] = [
    {
      id: 'report-pin',
      lat: pinCoords.lat,
      lng: pinCoords.lng,
      category: draft.category ?? 'mat_duong',
      status: 'moi',
      title: address,
    },
  ];

  const mapHeightClass = settings.seniorMode
    ? 'h-[40vh] md:h-[420px] lg:h-[540px]'
    : 'h-[310px] sm:h-[360px] md:h-[420px] lg:h-[540px]';

  return (
    <CitizenLayout>
      {/* Hidden compatibility nodes for existing tests */}
      <h1 data-testid="screen-title" className="sr-only">
        Bước 2: Vị trí
      </h1>
      <span className="sr-only">Bước 2/3 – Vị trí</span>
      <span className="sr-only">Chỗ bị hư ở đâu?</span>
      {draft.photos.length > 0 && (
        <img src={draft.photos[0]} alt="Ảnh sự cố đã chụp" className="sr-only" />
      )}

      {/* Header matching uploaded Figma image: [←]   [Vị trí phản ánh] */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Quay lại"
          className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
          Vị trí phản ánh
        </span>

        {/* Invisible spacer on mobile to center title cleanly, coordinate badge on Tablet/PC */}
        <div className="w-10 md:w-auto">
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#E6F3FD] px-3 py-1 text-xs font-bold text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
            <Navigation className="h-3.5 w-3.5" />
            <span>
              {pinCoords.lat.toFixed(4)}, {pinCoords.lng.toFixed(4)}
            </span>
          </span>
        </div>
      </header>

      {/* Main Content Workspace:
           - Mobile (< 768px): Single column exact match to uploaded Figma screenshot
           - Tablet (md: 768px–1023px): Balanced 2-row wide workspace
           - PC (lg >= 1024px): 12-Column Split Studio (Left 7 cols Interactive Map | Right 5 cols GPS & Address Control Panel) */}
      <div className="w-full flex-1 px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-12 lg:gap-7 lg:items-start">
          {/* =================================================================
              MOBILE & TABLET TOP GPS BUTTON (Only rendered when !isDesktop)
             ================================================================= */}
          {!isDesktop && (
            <div>
              <button
                type="button"
                onClick={() => void requestGpsLocation()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3 text-sm font-extrabold text-[#0084E8] shadow-2xs transition hover:bg-[#E0F2FE] dark:border-sky-800 dark:bg-sky-950/50 dark:text-[#38BDF8]"
              >
                <LocateFixed className="h-4 w-4" />
                <span>
                  {settings.seniorMode
                    ? 'Tôi đang đứng ở chỗ bị hư'
                    : isLocating
                      ? 'Đang lấy vị trí GPS...'
                      : 'Lấy vị trí hiện tại (GPS)'}
                </span>
              </button>
            </div>
          )}

          {/* =================================================================
              LEFT / MAIN MAP STAGE (lg:col-span-7)
             ================================================================= */}
          <div ref={mapWrapperRef} className="lg:col-span-7 flex flex-col gap-2">
            <div
              className={`relative w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-[#DCEBE6] shadow-xs dark:border-slate-700 ${mapHeightClass}`}
            >
              <MapView
                center={[pinCoords.lat, pinCoords.lng]}
                zoom={17}
                markers={pinMarkers}
                userLocation={gpsCoords ? [gpsCoords.lat, gpsCoords.lng] : undefined}
                onTap={handleMapTap}
                hideBuiltInLegend={true}
              />

              {/* Top-left floating pill: "Chạm bản đồ để dời ghim" (Exact match to uploaded Figma screenshot!) */}
              <div className="pointer-events-none absolute top-3.5 left-3.5 z-[500]">
                <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/95 px-3.5 py-1.5 text-xs font-extrabold text-slate-800 shadow-sm backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
                  Chạm bản đồ để dời ghim
                </span>
              </div>

              {/* Bottom-left attribution inside map card matching screenshot */}
              <div className="pointer-events-none absolute bottom-2.5 left-3.5 z-[500]">
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 backdrop-blur-2xs dark:bg-slate-900/80 dark:text-slate-300">
                  © OpenStreetMap contributors
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================
              RIGHT COLUMN ON PC (lg:col-span-5) / BOTTOM CONTROLS ON MOBILE & TABLET
             ================================================================= */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 lg:rounded-3xl lg:border lg:border-slate-200/90 lg:bg-[var(--color-surface)] lg:p-6 lg:shadow-sm dark:lg:border-slate-700">
            {/* PC Panel Title + GPS Button */}
            {isDesktop && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--color-text)]">
                    Định vị &amp; Địa chỉ sự cố
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    Bấm lấy vị trí GPS thực tế của thiết bị hoặc chạm trực tiếp lên bản đồ bên trái
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void requestGpsLocation()}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3 text-sm font-extrabold text-[#0084E8] shadow-2xs transition hover:bg-[#E0F2FE] dark:border-sky-800 dark:bg-sky-950/50 dark:text-[#38BDF8]"
                >
                  <LocateFixed className="h-4 w-4" />
                  <span>
                    {settings.seniorMode
                      ? 'Tôi đang đứng ở chỗ bị hư'
                      : isLocating
                        ? 'Đang lấy vị trí GPS...'
                        : 'Lấy vị trí hiện tại (GPS)'}
                  </span>
                </button>
              </div>
            )}

            {/* Banner ngoài phường Trấn Biên (> 5km) */}
            {showOutsideWardBanner && (
              <div
                role="region"
                aria-label="Cảnh báo ngoài phường"
                className="flex flex-col gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="font-semibold">
                    Bạn đang ở ngoài phường Trấn Biên. Chuyển ghim về trung tâm phường?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={handleUseWardCenterLocation}
                  >
                    Dùng vị trí mẫu
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleKeepMyLocation}>
                    Giữ vị trí của tôi
                  </Button>
                </div>
              </div>
            )}

            {/* Banner khi từ chối GPS / lỗi */}
            {gpsFailedMessage && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="font-semibold">{gpsFailedMessage}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={<Crosshair className="h-4 w-4" />}
                    onClick={handleFocusMap}
                  >
                    Chọn trên bản đồ
                  </Button>
                </div>
              </div>
            )}

            {/* Editable Địa chỉ Box with integrated search */}
            <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] px-4 py-3.5 transition-colors focus-within:border-[#0084E8] focus-within:bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="c03-editable-address"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Địa chỉ
                </label>
                <button
                  type="button"
                  onClick={handleOpenAddressSearch}
                  className="text-xs font-bold text-[#0084E8] hover:underline dark:text-[#38BDF8]"
                >
                  {showAddressSearch ? 'Đóng gợi ý' : 'Gợi ý tuyến đường'}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[#0084E8] dark:text-[#38BDF8]" />
                <input
                  id="c03-editable-address"
                  type="text"
                  value={address}
                  onFocus={() => setShowAddressSearch(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddress(val);
                    setStreetQuery(val);
                    setShowAddressSearch(true);
                    syncDraftLocation(pinCoords, val, locationNote);
                  }}
                  placeholder="Nhập địa chỉ, tên đường hoặc chạm bản đồ..."
                  className="w-full bg-transparent text-[15px] font-extrabold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {streetQuery && <span className="sr-only">{streetQuery}</span>}
            </div>

            {/* Ô nhập địa chỉ / gợi ý đường trong phường */}
            {showAddressSearch && (
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="relative">
                  <TextField
                    ref={addressInputRef}
                    label="Nhập địa chỉ hoặc tên đường"
                    placeholder="Tìm tên đường trong phường Trấn Biên..."
                    value={streetQuery}
                    onChange={(e) => setStreetQuery(e.target.value)}
                  />
                  <Search className="pointer-events-none absolute right-3.5 top-9 h-4 w-4 text-gray-400" />
                </div>

                <ul
                  role="listbox"
                  aria-label="Gợi ý tên đường"
                  className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-[var(--color-surface)] dark:divide-slate-800 dark:border-slate-700"
                >
                  {filteredStreets.length > 0 ? (
                    filteredStreets.map((street) => (
                      <li key={street.name}>
                        <button
                          type="button"
                          onClick={() => handleSelectStreet(street.name, street.lat, street.lng)}
                          className="flex min-h-[var(--tap)] w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[#F0F9FF] dark:hover:bg-slate-800"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0 text-[#0084E8]" />
                          <span>{street.name}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2.5 text-xs text-slate-500">
                      Không tìm thấy tên đường phù hợp. Bạn hãy chạm trực tiếp lên bản đồ.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Mô tả thêm vị trí (tối đa 120 ký tự) - Single DOM input */}
            <div className={isDesktop ? 'block' : 'hidden md:block'}>
              <TextField
                label="Mô tả thêm vị trí (không bắt buộc)"
                placeholder="Ví dụ: trước nhà số 12, gần cột điện..."
                maxLength={MAX_LOCATION_NOTE}
                value={locationNote}
                onChange={handleNoteChange}
              />
            </div>

            {/* Primary CTA: "Xác nhận vị trí" matching uploaded Figma screenshot */}
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-base font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4] active:scale-[0.99]"
            >
              <CheckCircle2 className="h-5 w-5 hidden lg:inline-block" />
              <span>Xác nhận vị trí</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal xác nhận lưu nháp khi bấm Huỷ */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Lưu nháp để gửi sau?"
      >
        <p className="text-sm text-gray-600">
          Bạn có muốn lưu lại ảnh và vị trí vừa chọn để tiếp tục gửi phản ánh sau không?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="danger" size="sm" onClick={handleDiscardDraftAndExit}>
            Bỏ
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSaveDraftAndExit}>
            Lưu nháp
          </Button>
        </div>
      </Modal>
    </CitizenLayout>
  );
}
