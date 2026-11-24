import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { MapView, MapMarker } from '@/components/map/MapView';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { WARD_CENTER } from '@/data/streets';
import { haversineMeters } from '@/domain/geo';
import { formatDistance } from '@/domain/format';
import { Category } from '@/domain/types';

export function C07Nearby() {
  const navigate = useNavigate();
  const { state } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  const userLat = WARD_CENTER.lat;
  const userLng = WARD_CENTER.lng;

  // Lọc theo loại sự cố
  const filteredReports = useMemo(() => {
    return state.reports.filter((r) => {
      if (r.status === 'da_gop') return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [state.reports, selectedCategory]);

  // Sắp xếp theo khoảng cách
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      const distA = haversineMeters(userLat, userLng, a.lat, a.lng);
      const distB = haversineMeters(userLat, userLng, b.lat, b.lng);
      return distA - distB;
    });
  }, [filteredReports, userLat, userLng]);

  // Map markers
  const markers: MapMarker[] = useMemo(() => {
    return sortedReports.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      category: r.category,
      status: r.status,
      title: `${r.id}: ${r.address}`,
      onClick: (id: string) => {
        setSelectedReportId(id);
        // Cuộn thẻ tương ứng vào khung nhìn
        const cardElem = document.getElementById(`carousel-card-${id}`);
        cardElem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      },
    }));
  }, [sortedReports]);

  // Đặt selectedReportId ban đầu là thẻ đầu tiên
  useEffect(() => {
    if (!selectedReportId && sortedReports.length > 0) {
      setSelectedReportId(sortedReports[0]!.id);
    }
  }, [selectedReportId, sortedReports]);

  return (
    <div className="relative flex h-screen flex-col bg-background select-none overflow-hidden pb-16">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Bản đồ quanh tôi
      </h1>

      {/* Header: "← Quanh đây · {n} vụ" + chip "1 km" */}
      <header className="z-20 border-b border-[#E5E7EB] bg-white px-4 py-2.5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Quay lại"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-bold text-gray-900">
              Quanh đây · {sortedReports.length} vụ
            </h2>
          </div>

          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary border border-blue-200">
            1 km
          </span>
        </div>

        {/* Chip lọc Tất cả / 4 loại cuộn ngang */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-white font-semibold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả ({state.reports.length})
          </button>

          {CATEGORY_CONFIGS.map((cfg) => {
            const isSel = selectedCategory === cfg.key;
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setSelectedCategory(cfg.key as Category)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isSel
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CategoryIcon category={cfg.key as Category} className="h-3.5 w-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Bản đồ lớn */}
      <main className="relative flex-1">
        <MapView
          center={[userLat, userLng]}
          zoom={15}
          markers={markers}
          selectedMarkerId={selectedReportId || undefined}
          className="h-full w-full"
        />

        {/* Carousel thẻ ngang ở đáy (ảnh + loại + địa chỉ · khoảng cách) */}
        <div
          ref={carouselRef}
          className="absolute bottom-2 left-0 right-0 z-1000 flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x no-scrollbar"
        >
          {sortedReports.map((report) => {
            const isSelected = report.id === selectedReportId;
            const catConfig = CATEGORY_CONFIGS.find((c) => c.key === report.category);
            const distMeters = haversineMeters(userLat, userLng, report.lat, report.lng);

            return (
              <div
                key={report.id}
                id={`carousel-card-${report.id}`}
                onClick={() => {
                  setSelectedReportId(report.id);
                  navigate(`/phan-anh/${report.id}`);
                }}
                className={`flex w-[290px] shrink-0 cursor-pointer items-center justify-between gap-2.5 rounded-card border bg-white p-2.5 shadow-lg snap-center transition-all ${
                  isSelected
                    ? 'border-2 border-primary ring-2 ring-blue-400/20'
                    : 'border-[#E5E7EB] hover:border-gray-300'
                }`}
              >
                {/* Ảnh 56px */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border border-gray-100 bg-gray-100">
                  <img
                    src={report.photos[0] || '/demo-photos/mat_duong/1.jpg'}
                    alt="Sự cố"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect fill="%23f3f4f6" width="60" height="60"/><text fill="%239ca3af" font-size="10" dy="3.5" x="50%" y="50%" text-anchor="middle">Ảnh</text></svg>';
                    }}
                  />
                </div>

                {/* Chi tiết */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-bold text-gray-900">
                      {catConfig?.label || report.category}
                    </span>
                    <StatusChip status={report.status} variant="public" size="sm" />
                  </div>

                  <p className="mt-0.5 truncate text-[11px] text-gray-600">{report.address}</p>

                  <p className="text-[10px] text-gray-400 font-medium">
                    Cách {formatDistance(distMeters)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
