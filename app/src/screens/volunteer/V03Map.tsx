import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { CATEGORY_CONFIGS, VOLUNTEERS } from '@/domain/constants';
import { Category, Report, VolunteerTask } from '@/domain/types';
import { haversineMeters } from '@/domain/geo';
import { formatDistance, formatRelativeTime } from '@/domain/format';
import { WARD_CENTER } from '@/data/streets';
import { getCurrentLocation } from '@/lib/geolocation';
import { getVolunteerSession } from '@/lib/portalSession';
import { MapMarker, MapView } from '@/components/map/MapView';
import { Modal, Toast } from '@/components/ui';
import { CategoryIcon } from '@/components/common/CategoryIcon';

const VOLUNTEER_STORAGE_KEY = 'tbkn:volunteer';

interface TaskMapItem {
  task: VolunteerTask;
  report: Report;
  distanceMeters: number;
}

const LEGEND_CATEGORY_ITEMS: ReadonlyArray<{ key: Category; label: string }> = [
  { key: 'den_duong', label: 'Đèn đường' },
  { key: 'ngap_nuoc', label: 'Ngập nước' },
  { key: 'rac_thai', label: 'Rác thải' },
  { key: 'mat_duong', label: 'Mặt đường' },
];

const LEGEND_STATUS_ITEMS = [
  { color: '#64748B', label: 'Chờ tiếp nhận / Cần xác minh' },
  { color: '#1D6AE5', label: 'Đã tiếp nhận / Nghiệm thu' },
  { color: '#EA580C', label: 'Đang xử lý / Đang làm' },
  { color: '#15803D', label: 'Đã xử lý / Đã xong' },
] as const;

function getInitialVolunteer(search: string): string {
  const session = getVolunteerSession();
  if (session?.name) return session.name;
  const params = new URLSearchParams(search);
  const fromQuery = params.get('tnv') || params.get('volunteer');
  if (fromQuery && (VOLUNTEERS as readonly string[]).includes(fromQuery)) {
    return fromQuery;
  }
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(VOLUNTEER_STORAGE_KEY);
    if (saved && (VOLUNTEERS as readonly string[]).includes(saved)) {
      return saved;
    }
  }
  return VOLUNTEERS[0];
}

function getTaskStatusBadge(task: VolunteerTask): { label: string; styleClass: string } {
  if (task.status === 'xong') {
    return {
      label: 'Đã xong',
      styleClass: 'bg-[#DCFCE7] text-[#15803D] dark:bg-emerald-950/70 dark:text-emerald-300',
    };
  }
  if (task.type === 'nghiem_thu') {
    return {
      label: 'Nghiệm thu',
      styleClass: 'bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-950/70 dark:text-blue-300',
    };
  }
  if (task.status === 'dang_lam') {
    return {
      label: 'Đang làm',
      styleClass: 'bg-[#FFEDD5] text-[#C2410C] dark:bg-orange-950/70 dark:text-orange-300',
    };
  }
  return {
    label: 'Cần xác minh',
    styleClass: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/70 dark:text-amber-300',
  };
}

export function V03Map() {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const currentVolunteer = useMemo(() => getInitialVolunteer(location.search), [location.search]);

  const [tileErrorNotice, setTileErrorNotice] = useState(false);
  const [wardWide, setWardWide] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let active = true;
    Promise.resolve(getCurrentLocation({ timeoutMs: 5000 }))
      .then((coords) => {
        if (!active || !coords) return;
        const distFromWard = haversineMeters(
          coords.lat,
          coords.lng,
          WARD_CENTER.lat,
          WARD_CENTER.lng
        );
        if (distFromWard <= 5000) {
          setUserLocation([coords.lat, coords.lng]);
        }
      })
      .catch(() => {
        // Fallback silently to ward center
      });

    return () => {
      active = false;
    };
  }, []);

  const referencePoint: [number, number] = useMemo(
    () => userLocation ?? [WARD_CENTER.lat, WARD_CENTER.lng],
    [userLocation]
  );

  const taskItems: TaskMapItem[] = useMemo(() => {
    const reportMap = new Map<string, Report>(state.reports.map((r) => [r.id, r]));
    const items: TaskMapItem[] = [];

    for (const task of state.volunteerTasks) {
      if (task.assignee !== currentVolunteer && task.assignee !== null) continue;
      const report = reportMap.get(task.reportId);
      if (!report) continue;

      if (selectedCategories.size > 0 && !selectedCategories.has(report.category)) {
        continue;
      }

      if (statusFilter === 'todo' && task.status === 'xong') {
        continue;
      }
      if (statusFilter === 'done' && task.status !== 'xong') {
        continue;
      }

      const distanceMeters = haversineMeters(
        referencePoint[0],
        referencePoint[1],
        report.lat,
        report.lng
      );

      if (!wardWide && distanceMeters > 5000) {
        continue;
      }

      items.push({ task, report, distanceMeters });
    }

    items.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return items;
  }, [
    state.volunteerTasks,
    state.reports,
    currentVolunteer,
    selectedCategories,
    statusFilter,
    referencePoint,
    wardWide,
  ]);

  const activeSelectedId = useMemo(() => {
    if (selectedId && taskItems.some((item) => item.task.id === selectedId)) {
      return selectedId;
    }
    return taskItems[0]?.task.id;
  }, [selectedId, taskItems]);

  const selectedItem = useMemo(
    () => taskItems.find((item) => item.task.id === activeSelectedId),
    [taskItems, activeSelectedId]
  );

  const effectiveMapCenter: [number, number] = useMemo(() => {
    if (selectedItem && selectedId) {
      return [selectedItem.report.lat, selectedItem.report.lng];
    }
    return wardWide ? [WARD_CENTER.lat, WARD_CENTER.lng] : referencePoint;
  }, [selectedItem, selectedId, wardWide, referencePoint]);

  const handleSelectMarker = (id: string) => {
    setSelectedId(id);
    const el = cardRefs.current[id];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const markers: MapMarker[] = useMemo(
    () =>
      taskItems.map(({ task, report }) => ({
        id: task.id,
        lat: report.lat,
        lng: report.lng,
        category: report.category,
        status: report.status,
        title: `${task.type === 'nghiem_thu' ? 'Nghiệm thu' : 'Xác minh'} – ${report.address}`,
        onClick: handleSelectMarker,
      })),
    [taskItems]
  );

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedCategories(new Set());
    setStatusFilter('all');
  };

  const isAllActive = selectedCategories.size === 0 && statusFilter === 'all';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/tnv');
    }
  };

  const orderedCategories = useMemo(() => {
    const order: Category[] = ['den_duong', 'mat_duong', 'ngap_nuoc', 'rac_thai'];
    return order
      .map((key) => CATEGORY_CONFIGS.find((c) => c.key === key))
      .filter((c): c is (typeof CATEGORY_CONFIGS)[number] => Boolean(c));
  }, []);

  return (
    <VolunteerLayout>
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--color-bg)]">
        <h1 data-testid="screen-title" className="sr-only">
          Bản đồ nhiệm vụ TNV
        </h1>

        <div className="relative flex-1 h-full w-full">
          {/* 1. Fullscreen Interactive Map Background */}
          <div className="absolute inset-0">
            <MapView
              center={effectiveMapCenter}
              zoom={wardWide ? 13 : 14}
              markers={markers}
              selectedMarkerId={activeSelectedId}
              radiusCircle={wardWide ? undefined : { center: referencePoint, radiusMeters: 5000 }}
              userLocation={referencePoint}
              onTileError={() => setTileErrorNotice(true)}
              hideBuiltInLegend={true}
              errorBannerClassName="inset-x-3 bottom-24 md:bottom-auto md:top-4 md:left-[448px] md:right-4"
            />
          </div>

          {/* 2. Unified Control & Task Panel */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[416px] md:p-0 md:flex md:flex-col">
            <div className="pointer-events-auto flex flex-col rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] shadow-[0_8px_28px_rgba(15,23,42,0.12)] dark:border-slate-700 md:h-full md:overflow-hidden">
              {/* Header Row: [←]  [Nhiệm vụ · N việc]  [5 km / Toàn phường] */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Quay lại"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[var(--color-text)] transition-colors hover:bg-slate-200 dark:bg-slate-800"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>

                <span className="truncate text-base font-extrabold text-[var(--color-text)]">
                  Nhiệm vụ · {taskItems.length} việc
                </span>

                <button
                  type="button"
                  onClick={() => setWardWide((prev) => !prev)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    wardWide
                      ? 'bg-[#0084E8] text-white shadow-2xs'
                      : 'bg-[#EFF6FF] text-[#0084E8] hover:bg-[#DBEAFE] dark:bg-sky-950/60 dark:text-[#38BDF8]'
                  }`}
                >
                  {wardWide ? 'Toàn phường' : '5 km'}
                </button>
              </div>

              {/* Smart Filter Block */}
              <div className="space-y-2 bg-slate-50/70 px-3 py-2.5 dark:bg-slate-900/50 md:border-b md:border-slate-200/80 dark:md:border-slate-800">
                {/* Row A: Task Status Segment Filter */}
                <div className="flex items-center justify-between gap-2">
                  <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-slate-200/75 p-1 dark:bg-slate-800">
                    <button
                      type="button"
                      aria-pressed={isAllActive}
                      onClick={resetFilters}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                        isAllActive
                          ? 'bg-[#0084E8] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      Tất cả
                    </button>

                    <button
                      type="button"
                      aria-pressed={statusFilter === 'todo'}
                      onClick={() => setStatusFilter((prev) => (prev === 'todo' ? 'all' : 'todo'))}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                        statusFilter === 'todo'
                          ? 'bg-[#0084E8] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          statusFilter === 'todo' ? 'bg-white' : 'bg-[#EA580C]'
                        }`}
                      />
                      <span className="whitespace-nowrap">Cần làm</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={statusFilter === 'done'}
                      onClick={() => setStatusFilter((prev) => (prev === 'done' ? 'all' : 'done'))}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                        statusFilter === 'done'
                          ? 'bg-[#0084E8] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          statusFilter === 'done' ? 'bg-white' : 'bg-[#15803D]'
                        }`}
                      />
                      <span className="whitespace-nowrap">Đã xong</span>
                    </button>
                  </div>

                  {!isAllActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      title="Xoá bộ lọc"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Row B: 2x2 Category Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {orderedCategories.map((cat) => {
                    const active = selectedCategories.has(cat.key);
                    const shortLabel = cat.key === 'ngap_nuoc' ? 'Ngập nước' : cat.label;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCategory(cat.key)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                          active
                            ? 'border-[#0084E8] bg-[#0084E8] text-white shadow-2xs'
                            : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <CategoryIcon
                          category={cat.key}
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-white' : 'text-[#0084E8] dark:text-[#38BDF8]'
                          }`}
                        />
                        <span className="whitespace-nowrap">{shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PC Only: Integrated Vertical Scrollable Task List inside the Left Panel */}
              <div className="hidden md:flex md:flex-1 md:flex-col md:overflow-y-auto md:bg-slate-50/40 md:p-3 md:space-y-2.5 dark:md:bg-slate-950/30">
                {taskItems.length > 0 ? (
                  taskItems.map(({ task, report, distanceMeters }) => {
                    const catConfig =
                      CATEGORY_CONFIGS.find((c) => c.key === report.category) ||
                      CATEGORY_CONFIGS[0]!;
                    const photo = report.photos[0] || `/demo-photos/${report.category}/1.jpg`;
                    const isSelected = task.id === activeSelectedId;
                    const relTime = formatRelativeTime(report.createdAt, state.settings.demoNow);
                    const distText = formatDistance(distanceMeters);
                    const badge = getTaskStatusBadge(task);

                    return (
                      <div
                        key={`pc-${task.id}`}
                        onClick={() => {
                          if (isSelected) {
                            navigate(`/tnv/${task.id}`);
                          } else {
                            setSelectedId(task.id);
                          }
                        }}
                        className={`relative w-full cursor-pointer rounded-2xl p-3 transition-all ${
                          isSelected
                            ? 'border-2 border-[#0084E8] bg-[#F0F8FF] shadow-md dark:bg-sky-950/40'
                            : 'border border-slate-200/90 bg-[var(--color-surface)] shadow-2xs hover:border-slate-300 hover:shadow-sm dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={photo}
                            alt={`Ảnh ${catConfig.label}`}
                            className="h-[68px] w-[76px] flex-shrink-0 rounded-xl object-cover bg-slate-200"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {relTime}
                              </span>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight ${badge.styleClass}`}
                              >
                                {badge.label}
                              </span>
                            </div>

                            <p
                              className={`truncate text-[14px] font-extrabold leading-snug ${
                                isSelected
                                  ? 'text-[#0084E8] dark:text-[#38BDF8]'
                                  : 'text-[var(--color-text)]'
                              }`}
                            >
                              {report.title || report.description || catConfig.label}
                            </p>

                            <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                              {report.address} · {distText}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="my-auto rounded-2xl border border-slate-200 bg-[var(--color-surface)] p-5 text-center dark:border-slate-800">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      Không có nhiệm vụ nào trong bán kính 5 km phù hợp bộ lọc.
                    </p>
                    {!wardWide && (
                      <button
                        type="button"
                        onClick={() => setWardWide(true)}
                        className="mt-2 text-xs font-bold text-[#0084E8] hover:underline"
                      >
                        Xem toàn phường
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tile Error Notice Toast */}
          {tileErrorNotice && (
            <div className="pointer-events-auto absolute top-28 right-4 z-40 max-w-sm">
              <Toast
                type="warning"
                message="Kết nối bản đồ không ổn định, một số ô bản đồ có thể tải chậm."
                onClose={() => setTileErrorNotice(false)}
              />
            </div>
          )}

          {/* 3. Chú giải Button: ⓘ Chú giải */}
          <div className="pointer-events-none absolute right-3.5 bottom-[128px] z-20 md:bottom-6 md:right-6">
            <button
              type="button"
              onClick={() => setShowLegendModal(true)}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-[var(--color-surface)] px-4 py-2 text-xs font-extrabold text-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.14)] transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Info className="h-4 w-4 text-[#1D6AE5] dark:text-[#38BDF8]" strokeWidth={2.25} />
              <span>Chú giải</span>
            </button>
          </div>

          {/* 4. Mobile Only (< 768px): Bottom Horizontal Peeking Carousel */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3.5 z-20 md:hidden">
            {taskItems.length > 0 ? (
              <div
                aria-label="Nhiệm vụ gần đây"
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-1 no-scrollbar"
              >
                {taskItems.map(({ task, report, distanceMeters }) => {
                  const catConfig =
                    CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;
                  const photo = report.photos[0] || `/demo-photos/${report.category}/1.jpg`;
                  const isSelected = task.id === activeSelectedId;
                  const relTime = formatRelativeTime(report.createdAt, state.settings.demoNow);
                  const distText = formatDistance(distanceMeters);
                  const badge = getTaskStatusBadge(task);

                  return (
                    <div
                      key={task.id}
                      ref={(el) => {
                        cardRefs.current[task.id] = el;
                      }}
                      onClick={() => {
                        if (isSelected) {
                          navigate(`/tnv/${task.id}`);
                        } else {
                          setSelectedId(task.id);
                        }
                      }}
                      className={`pointer-events-auto relative w-[312px] sm:w-[340px] flex-shrink-0 snap-start cursor-pointer rounded-2xl p-3 transition-all ${
                        isSelected
                          ? 'border-2 border-[#0084E8] bg-[#F8FBFF] shadow-lg dark:bg-slate-900'
                          : 'border border-slate-200 bg-[var(--color-surface)] shadow-md hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={photo}
                          alt={`Ảnh ${catConfig.label}`}
                          className="h-[72px] w-[84px] flex-shrink-0 rounded-xl object-cover bg-slate-200"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {relTime}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight ${badge.styleClass}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <p
                            className={`truncate text-[15px] font-extrabold leading-snug ${
                              isSelected
                                ? 'text-[#0084E8] dark:text-[#38BDF8]'
                                : 'text-[var(--color-text)]'
                            }`}
                          >
                            {report.title || report.description || catConfig.label}
                          </p>

                          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                            {report.address} · {distText}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mx-3.5 pointer-events-auto rounded-2xl border border-slate-200 bg-[var(--color-surface)] p-4 text-center shadow-lg dark:border-slate-700">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  Không có nhiệm vụ nào trong bán kính 5 km phù hợp bộ lọc.
                </p>
                {!wardWide && (
                  <button
                    type="button"
                    onClick={() => setWardWide(true)}
                    className="mt-1.5 text-xs font-bold text-[#0084E8] hover:underline"
                  >
                    Xem toàn phường
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 5. Bảng chú giải bản đồ Modal */}
        <Modal
          isOpen={showLegendModal}
          onClose={() => setShowLegendModal(false)}
          title="Bảng chú giải bản đồ"
        >
          <div className="space-y-5 text-sm">
            <div>
              <h4 className="mb-2.5 text-sm font-bold text-[var(--color-text)]">Loại sự cố</h4>
              <div className="grid grid-cols-2 gap-2.5">
                {LEGEND_CATEGORY_ITEMS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/70"
                  >
                    <CategoryIcon
                      category={key}
                      className="h-4 w-4 shrink-0 text-[#1D6AE5] dark:text-[#38BDF8]"
                    />
                    <span className="font-semibold text-[var(--color-text)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2.5 text-sm font-bold text-[var(--color-text)]">
                Màu sắc trạng thái
              </h4>
              <div className="space-y-2.5">
                {LEGEND_STATUS_ITEMS.map((status) => (
                  <div key={status.label} className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-2xs"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {status.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </VolunteerLayout>
  );
}
