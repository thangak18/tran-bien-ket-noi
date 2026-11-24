import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Category, Status } from '@/domain/types';
import { CATEGORY_CONFIGS, STATUS_CONFIGS } from '@/domain/constants';
import { Modal } from '@/components/ui/Modal';
import { AlertTriangle, Info, MapPin } from 'lucide-react';

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
  className?: string;
}

// Marker icon generator using L.divIcon
function createCustomDivIcon(category: Category, status: Status, isSelected: boolean) {
  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === category) || CATEGORY_CONFIGS[0]!;
  const statConfig = STATUS_CONFIGS[status] || STATUS_CONFIGS.moi;

  const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
    gray: { bg: '#94a3b8', border: '#64748b', text: '#ffffff' },
    blue: { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
    orange: { bg: '#f97316', border: '#c2410c', text: '#ffffff' },
    green: { bg: '#10b981', border: '#047857', text: '#ffffff' },
    purple: { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' },
    red: { bg: '#ef4444', border: '#b91c1c', text: '#ffffff' },
    yellow: { bg: '#eab308', border: '#a16207', text: '#ffffff' },
  };

  const c = colorStyles[statConfig.color] || colorStyles.gray!;

  const iconSvgs: Record<Category, string> = {
    den_duong: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
    ngap_nuoc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    rac_thai: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
    mat_duong: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`,
  };

  const svg = iconSvgs[category] || iconSvgs.mat_duong;
  const label = `${catConfig.label} – ${statConfig.publicLabel}`;
  const ring = isSelected ? 'box-shadow: 0 0 0 4px #0284c7;' : '';

  const html = `
    <div
      role="button"
      tabindex="0"
      aria-label="${label}"
      class="map-marker-div"
      style="
        background-color: ${c.bg};
        border: 2px solid ${c.border};
        color: ${c.text};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease;
        ${ring}
      "
    >
      ${svg}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
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
  className = '',
}) => {
  const [showLegend, setShowLegend] = useState(false);
  const [tileErrorOccurred, setTileErrorOccurred] = useState(false);
  const tilesLoadedRef = useRef(0);
  const tilesErrorRef = useRef(0);

  useEffect(() => {
    if (simulateTileError) {
      setTileErrorOccurred(true);
      onTileError?.();
      return;
    }

    // Chỉ hiện banner khi KHÔNG tải được tile nào trong 8 giây đầu và có lỗi tile
    const timer = setTimeout(() => {
      if (tilesLoadedRef.current === 0 && tilesErrorRef.current > 0) {
        setTileErrorOccurred(true);
        onTileError?.();
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [simulateTileError, onTileError]);

  const handleTileLoad = () => {
    tilesLoadedRef.current += 1;
  };

  const handleTileError = () => {
    tilesErrorRef.current += 1;
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
      className={`relative h-full w-full overflow-hidden bg-slate-100 ${className}`}
    >
      {/* Fallback khi tile lỗi (không che nút zoom ở góc trên bên trái) */}
      {tileErrorOccurred && (
        <div
          data-testid="tile-error-banner"
          className="absolute left-14 right-4 top-3 z-[1000] flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-md"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold">Không thể tải bản đồ.</span> Vui lòng kiểm tra kết nối
            mạng hoặc chuyển sang xem dạng danh sách.
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            load: handleTileLoad,
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
                color: '#0284c7',
                fillColor: '#38bdf8',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '4, 4',
              }}
            />
          )}

        {/* Vị trí của bạn */}
        {userLocation && (
          <Marker
            position={userLocation}
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

      {/* Nút Chú giải góc dưới */}
      <div className="absolute bottom-4 left-4 z-[999]">
        <button
          type="button"
          onClick={() => setShowLegend(true)}
          className="flex min-h-[var(--tap)] items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-md backdrop-blur-xs hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Info className="h-4 w-4 text-primary" />
          <span>Chú giải</span>
        </button>
      </div>

      {/* Modal Chú giải (bảng chữ) */}
      <Modal isOpen={showLegend} onClose={() => setShowLegend(false)} title="Bảng chú giải bản đồ">
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Loại sự cố</h4>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_CONFIGS.map((cat) => (
                <div key={cat.key} className="flex items-center gap-2 rounded-xl bg-gray-50 p-2">
                  <MapPin className="h-4 w-4 text-primary" />
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
