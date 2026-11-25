import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Category, Status } from '@/domain/types';
import { CATEGORY_CONFIGS, STATUS_CONFIGS } from '@/domain/constants';
import { Modal } from '@/components/ui/Modal';
import { AlertTriangle, Info, Loader2, LocateFixed } from 'lucide-react';
import { CategoryIcon, renderCategorySvgHtml } from '@/components/common/CategoryIcon';
import { Coordinates, getCurrentLocation } from '@/lib/geolocation';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  category: Category;
  status: Status;
  title?: string;
  onClick?: (id: string) => void;
}

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  selectedMarkerId?: string;
  radiusCircle?: {
    center: [number, number];
    radiusMeters: number;
  };
  userLocation?: [number, number];
  onTap?: (lat: number, lng: number) => void;
  onTileError?: () => void;
  simulateTileError?: boolean;
  hideBuiltInLegend?: boolean;
  autoLocateUser?: boolean;
  showLocateButton?: boolean;
  locateButtonClassName?: string;
  onUserLocationChange?: (coords: Coordinates) => void;
  errorBannerClassName?: string;
  className?: string;
}

// Marker icon generator using L.divIcon
function createCustomDivIcon(category: Category, status: Status, isSelected: boolean) {
  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === category) || CATEGORY_CONFIGS[0]!;
  const statConfig = STATUS_CONFIGS[status] || STATUS_CONFIGS.moi;

  const colorStyles: Record<string, { bg: string; text: string }> = {
    gray: { bg: '#64748b', text: '#ffffff' },
    blue: { bg: '#1d6ae5', text: '#ffffff' },
    orange: { bg: '#ea580c', text: '#ffffff' },
    green: { bg: '#15803d', text: '#ffffff' },
    purple: { bg: '#7e22ce', text: '#ffffff' },
    red: { bg: '#dc2626', text: '#ffffff' },
    yellow: { bg: '#d97706', text: '#ffffff' },
  };

  const c = colorStyles[statConfig.color] || colorStyles.gray!;

  const svg = renderCategorySvgHtml(category, 18);
  const label = `${catConfig.label} – ${statConfig.publicLabel}`;
  const size = isSelected ? 44 : 36;
  const bg = isSelected ? '#0084E8' : c.bg;
  const shadow = isSelected
    ? '0 4px 14px rgba(0, 132, 232, 0.45)'
    : '0 3px 10px rgba(15, 23, 42, 0.22)';

  const html = `
    <div
      role="button"
      tabindex="0"
      aria-label="${label}"
      class="map-marker-div"
      style="
        background-color: ${bg};
        border: 3px solid #ffffff;
        color: ${c.text};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: ${shadow};
        transition: transform 0.15s ease;
      "
    >
      ${svg}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapClickHandler({ onTap }: { onTap?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onTap) {
        onTap(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapViewportSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const [lat, lng] = center;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')) {
      return;
    }
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      map.setView([lat, lng], zoom, { animate: true });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [map, lat, lng, zoom]);

  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  center,
  zoom = 14,
  markers = [],
  selectedMarkerId,
  radiusCircle,
  userLocation,
  onTap,
  onTileError,
  simulateTileError = false,
  hideBuiltInLegend = false,
  autoLocateUser = false,
  showLocateButton = false,
  locateButtonClassName = 'bottom-4 right-4',
  onUserLocationChange,
  errorBannerClassName = 'inset-x-4 top-4',
  className = '',
}) => {
  const [showLegend, setShowLegend] = useState(false);
  const [tileErrorOccurred, setTileErrorOccurred] = useState(false);
  const [liveUserLocation, setLiveUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [focusOverride, setFocusOverride] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!autoLocateUser) return;
    if (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')) {
      return;
    }
    let active = true;
    getCurrentLocation({ timeoutMs: 5000 })
      .then((coords) => {
        if (!active) return;
        setLiveUserLocation([coords.lat, coords.lng]);
        onUserLocationChange?.(coords);
      })
      .catch(() => {
        // Bỏ qua nếu người dùng chưa cấp quyền GPS
      });
    return () => {
      active = false;
    };
  }, [autoLocateUser, onUserLocationChange]);

  const handleLocateClick = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const coords = await getCurrentLocation({ timeoutMs: 6000 });
      const pair: [number, number] = [coords.lat, coords.lng];
      setLiveUserLocation(pair);
      setFocusOverride(pair);
      onUserLocationChange?.(coords);
    } catch {
      // Giữ nguyên vị trí hiện tại nếu không lấy được GPS
    } finally {
      setLocating(false);
    }
  };

  const effectiveCenter = focusOverride ?? center;
  const effectiveUserLocation = liveUserLocation ?? userLocation;

  useEffect(() => {
    if (simulateTileError) {
      setTileErrorOccurred(true);
      onTileError?.();
    }
  }, [simulateTileError, onTileError]);

  const handleTileError = () => {
    setTileErrorOccurred(true);
    onTileError?.();
  };

  return (
    <div
      data-testid="map-container"
      onClick={(e) => {
        // Fallback for jsdom environments where Leaflet events may not fire
        if (onTap && e.target === e.currentTarget) {
          onTap(center[0], center[1]);
        }
      }}
      className={`relative isolate z-0 h-full w-full overflow-hidden bg-slate-100 ${className}`}
    >
      {/* Fallback khi tile lỗi */}
      {tileErrorOccurred && (
        <div
          className={`pointer-events-auto absolute z-[1000] flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950 shadow-md dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-100 ${errorBannerClassName}`}
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Không thể tải bản đồ.</span> Vui lòng kiểm tra kết nối
            mạng hoặc chuyển sang xem dạng danh sách.
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={effectiveCenter}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapViewportSync center={effectiveCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: handleTileError,
          }}
        />

        <MapClickHandler onTap={onTap} />

        {/* Vòng bán kính (AC-C07) */}
        {radiusCircle &&
          !(typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')) && (
            <Circle
              center={radiusCircle.center}
              radius={radiusCircle.radiusMeters}
              pathOptions={{
                color: '#60a5fa',
                fillColor: '#38bdf8',
                fillOpacity: 0.13,
                weight: 1.5,
              }}
            />
          )}

        {/* Vị trí của bạn */}
        {effectiveUserLocation && (
          <Marker
            position={effectiveUserLocation}
            icon={L.divIcon({
              html: `
                <div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 0 2px #2563eb;"></div>
              `,
              className: 'user-location-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />
        )}

        {/* Markers */}
        {markers.map((m) => {
          const isSelected = m.id === selectedMarkerId;
          const icon = createCustomDivIcon(m.category, m.status, isSelected);

          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={icon}
              eventHandlers={{
                click: () => m.onClick?.(m.id),
              }}
            />
          );
        })}
      </MapContainer>

      {/* Nút GPS vị trí hiện tại */}
      {showLocateButton && (
        <div className={`absolute z-[999] ${locateButtonClassName}`}>
          <button
            type="button"
            onClick={handleLocateClick}
            disabled={locating}
            aria-label="Lấy vị trí GPS hiện tại"
            title="Vị trí hiện tại của tôi"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-md transition-all duration-150 hover:bg-[var(--color-surface-elevated)] active:scale-95 disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      )}

      {/* Nút Chú giải góc dưới */}
      {!hideBuiltInLegend && (
        <div className="absolute bottom-4 left-4 z-[999]">
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="flex min-h-[var(--tap)] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-md hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Info className="h-4 w-4 text-primary" />
            <span>Chú giải</span>
          </button>
        </div>
      )}

      {/* Modal Chú giải (bảng chữ) */}
      <Modal isOpen={showLegend} onClose={() => setShowLegend(false)} title="Bảng chú giải bản đồ">
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Loại sự cố</h4>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_CONFIGS.map((cat) => (
                <div key={cat.key} className="flex items-center gap-2 rounded-xl bg-gray-50 p-2">
                  <CategoryIcon category={cat.key} className="h-4 w-4 text-primary" />
                  <span className="font-medium text-gray-800">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Màu sắc trạng thái</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full bg-gray-400 border border-gray-500" />
                <span className="text-gray-700">Chờ tiếp nhận</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full bg-blue-500 border border-blue-600" />
                <span className="text-gray-700">Đã tiếp nhận</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full bg-amber-500 border border-amber-600" />
                <span className="text-gray-700">Đang xử lý</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 border border-emerald-600" />
                <span className="text-gray-700">Đã xử lý</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
