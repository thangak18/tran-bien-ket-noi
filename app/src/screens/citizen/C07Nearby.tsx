import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, List, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { MapView, MapMarker } from '@/components/map/MapView';
import { ReportCard } from '@/components/citizen/ReportCard';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { WARD_CENTER } from '@/data/streets';
import { haversineMeters } from '@/domain/geo';
import { Category } from '@/domain/types';

export function C07Nearby() {
  const navigate = useNavigate();
  const { state } = useAppStore();

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const now = state.settings.demoNow;
  const userLat = WARD_CENTER.lat;
  const userLng = WARD_CENTER.lng;

  // Lọc theo loại sự cố
  const filteredReports = useMemo(() => {
    return state.reports.filter((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [state.reports, selectedCategory]);

  // Sắp xếp theo khoảng cách cho chế độ danh sách
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => {
      const distA = haversineMeters(userLat, userLng, a.lat, a.lng);
      const distB = haversineMeters(userLat, userLng, b.lat, b.lng);
      return distA - distB;
    });
  }, [filteredReports, userLat, userLng]);

  // Map markers
  const markers: MapMarker[] = useMemo(() => {
    return filteredReports.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      category: r.category,
      status: r.status,
      title: `${r.id}: ${r.address}`,
      onClick: (id: string) => setSelectedReportId(id),
    }));
  }, [filteredReports]);

  const selectedReport = useMemo(() => {
    return state.reports.find((r) => r.id === selectedReportId) || null;
  }, [state.reports, selectedReportId]);

  return (
    <div className="flex h-screen flex-col bg-gray-50 pb-16">
      {/* Header */}
      <header className="z-20 border-b border-gray-200 bg-white px-4 py-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900" data-testid="screen-title">
            Bản đồ quanh tôi
          </h1>

          {/* Công tắc Bản đồ | Danh sách */}
          <div className="flex rounded-xl bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'map' ? 'bg-white text-primary shadow-2xs' : 'text-gray-600'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              <span>Bản đồ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-white text-primary shadow-2xs' : 'text-gray-600'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Danh sách</span>
            </button>
          </div>
        </div>

        {/* Thanh chip lọc loại cuộn ngang */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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

      {/* Nội dung chính */}
      <main className="relative flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          <div className="relative h-full w-full">
            <MapView
              center={[userLat, userLng]}
              zoom={15}
              markers={markers}
              selectedMarkerId={selectedReportId || undefined}
              className="h-full w-full"
            />

            {/* Thẻ preview khi chọn marker */}
            {selectedReport && (
              <div className="absolute bottom-4 left-4 right-4 z-1000 mx-auto max-w-md">
                <div
                  onClick={() => navigate(`/phan-anh/${selectedReport.id}`)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg hover:border-primary-400"
                >
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    <img
                      src={selectedReport.photos[0] || '/demo-photos/mat_duong/1.jpg'}
                      alt="Ảnh"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect fill="%23f3f4f6" width="60" height="60"/><text fill="%239ca3af" font-size="10" dy="3.5" x="50%" y="50%" text-anchor="middle">Ảnh</text></svg>';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {selectedReport.id}
                      </span>
                      <StatusChip status={selectedReport.status} variant="public" size="sm" />
                    </div>
                    <p className="truncate text-xs font-medium text-gray-800">
                      {selectedReport.address}
                    </p>
                    <p className="text-[11px] text-gray-500">Chạm để xem chi tiết</p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto">
            {sortedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                now={now}
                onClick={() => navigate(`/phan-anh/${report.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
