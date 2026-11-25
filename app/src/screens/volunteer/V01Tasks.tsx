import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Map as MapIcon,
  MapPin,
  Navigation,
  UserCheck,
} from 'lucide-react';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { VolunteerProfileView } from '@/screens/volunteer/VolunteerProfileView';
import { Button, Card, EmptyState, SelectField, Tabs, Toast } from '@/components/ui';
import { MapView } from '@/components/map/MapView';
import { CATEGORY_CONFIGS, VOLUNTEERS } from '@/domain/constants';
import { formatDistance } from '@/domain/format';
import { haversineMeters } from '@/domain/geo';
import { WARD_CENTER } from '@/data/streets';
import { getCurrentLocation } from '@/lib/geolocation';
import { useAppStore } from '@/store/AppStore';
import { Report, VolunteerTask } from '@/domain/types';

const VOLUNTEER_STORAGE_KEY = 'tbkn:volunteer';
const TNV_NOTIF_STORAGE_KEY = 'tbkn:tnv-notif';

function getInitialVolunteer(search: string): string {
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

interface TaskWithMeta {
  task: VolunteerTask;
  report: Report | undefined;
  distanceMeters: number;
}

export function V01Tasks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppStore();

  const [currentVolunteer, setCurrentVolunteer] = useState<string>(() =>
    getInitialVolunteer(location.search)
  );
  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(WARD_CENTER);
  const [hasGps, setHasGps] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(TNV_NOTIF_STORAGE_KEY) !== 'off';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(() => {
    const navState = location.state as { toast?: string } | null;
    return navState?.toast ?? null;
  });

  useEffect(() => {
    let active = true;
    getCurrentLocation({ timeoutMs: 5000 })
      .then((coords) => {
        if (active) {
          setUserCoords(coords);
          setHasGps(true);
        }
      })
      .catch(() => {
        // Fallback giữ nguyên WARD_CENTER khi không có GPS
      });
    return () => {
      active = false;
    };
  }, []);

  const handleVolunteerChange = (name: string) => {
    setCurrentVolunteer(name);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOLUNTEER_STORAGE_KEY, name);
    }
  };

  const handleToggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TNV_NOTIF_STORAGE_KEY, next ? 'on' : 'off');
    }
  };

  const { todoTasks, doneTasks } = useMemo(() => {
    const reportMap = new Map<string, Report>(state.reports.map((r) => [r.id, r]));

    const relevant = state.volunteerTasks.filter(
      (task) => task.assignee === currentVolunteer || task.assignee === null
    );

    const withMeta: TaskWithMeta[] = relevant.map((task) => {
      const report = reportMap.get(task.reportId);
      const distanceMeters = report
        ? haversineMeters(userCoords.lat, userCoords.lng, report.lat, report.lng)
        : Number.MAX_SAFE_INTEGER;
      return { task, report, distanceMeters };
    });

    withMeta.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      todoTasks: withMeta.filter((item) => item.task.status !== 'xong'),
      doneTasks: withMeta.filter((item) => item.task.status === 'xong'),
    };
  }, [state.volunteerTasks, state.reports, currentVolunteer, userCoords]);

  const getCategoryLabel = (report?: Report) => {
    if (!report) return 'Sự cố';
    return CATEGORY_CONFIGS.find((c) => c.key === report.category)?.label ?? 'Sự cố';
  };

  // V03 · Bản đồ nhiệm vụ TNV (/tnv/ban-do)
  if (location.pathname === '/tnv/ban-do') {
    const mappableTasks = todoTasks.filter((item) => Boolean(item.report));
    const activeItem =
      mappableTasks.find((item) => item.task.id === selectedTaskId) ?? mappableTasks[0] ?? null;

    const markers = mappableTasks.map(({ task, report }) => ({
      id: task.id,
      lat: report!.lat,
      lng: report!.lng,
      category: report!.category,
      status: report!.status,
      title: `${getCategoryLabel(report)} – ${report!.address}`,
      onClick: (id: string) => setSelectedTaskId(id),
    }));

    return (
      <VolunteerLayout>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Quay lại danh sách nhiệm vụ"
                icon={<ArrowLeft className="h-5 w-5" />}
                onClick={() => navigate('/tnv')}
              />
              <h1
                data-testid="screen-title"
                className="text-[var(--fs-title)] font-bold text-[var(--color-text)]"
              >
                Bản đồ nhiệm vụ
              </h1>
            </div>
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-dark">
              {mappableTasks.length} điểm
            </span>
          </header>

          {mappableTasks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<ClipboardCheck />}
                title="Hiện chưa có nhiệm vụ"
                description="Không có nhiệm vụ nào đang chờ xác minh trên bản đồ."
                actionText="Về danh sách"
                onAction={() => navigate('/tnv')}
              />
            </div>
          ) : (
            <div className="relative flex-1 min-h-[calc(100vh-140px)]">
              <MapView
                center={
                  activeItem?.report
                    ? [activeItem.report.lat, activeItem.report.lng]
                    : [userCoords.lat, userCoords.lng]
                }
                zoom={15}
                markers={markers}
                selectedMarkerId={activeItem?.task.id}
                userLocation={[userCoords.lat, userCoords.lng]}
                className="h-full w-full"
              />

              {/* Distance pills overlay */}
              <div className="pointer-events-none absolute left-0 right-0 top-3 z-[400] flex gap-2 overflow-x-auto px-3 no-scrollbar">
                {mappableTasks.map(({ task, distanceMeters }) => {
                  const isSelected = activeItem?.task.id === task.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`pointer-events-auto flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md transition-colors ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-white/95 text-gray-800 hover:bg-white'
                      }`}
                    >
                      {task.reportId} · {formatDistance(distanceMeters)}
                    </button>
                  );
                })}
              </div>

              {/* Floating task card at bottom */}
              {activeItem && activeItem.report && (
                <div className="pointer-events-none absolute bottom-4 left-3 right-3 z-[400]">
                  <Card className="pointer-events-auto border-2 border-primary/30 bg-white/95 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          activeItem.task.type === 'xac_minh'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {activeItem.task.type === 'xac_minh'
                          ? 'Xác minh ban đầu'
                          : 'Nghiệm thu sau xử lý'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-dark">
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDistance(activeItem.distanceMeters)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h2 className="text-base font-bold text-gray-900">
                        {activeItem.report.title || getCategoryLabel(activeItem.report)}
                      </h2>
                      <span className="text-xs text-gray-500">{activeItem.task.reportId}</span>
                    </div>
                    {activeItem.report.title && (
                      <p className="mt-0.5 text-xs font-semibold text-primary">
                        {getCategoryLabel(activeItem.report)}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-1 text-xs text-gray-600">
                      {activeItem.report.address}
                    </p>

                    <div className="mt-3">
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => navigate(`/tnv/${activeItem.task.id}`)}
                      >
                        Thực hiện xác minh ›
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </VolunteerLayout>
    );
  }

  // V04 · Hồ sơ TNV (/tnv/ho-so)
  if (location.pathname === '/tnv/ho-so') {
    const nearestMeters =
      todoTasks.length > 0 && todoTasks[0]?.report ? todoTasks[0].distanceMeters : null;

    return (
      <VolunteerLayout>
        <VolunteerProfileView
          currentVolunteer={currentVolunteer}
          onVolunteerChange={handleVolunteerChange}
          todoCount={todoTasks.length}
          doneCount={doneTasks.length}
          nearestMeters={nearestMeters}
          hasGps={hasGps}
          notifEnabled={notifEnabled}
          onToggleNotif={handleToggleNotif}
        />
      </VolunteerLayout>
    );
  }

  // V01 · Nhiệm vụ TNV (/tnv)
  const displayedTasks = activeTab === 'todo' ? todoTasks : doneTasks;

  return (
    <VolunteerLayout>
      <div className="flex flex-col gap-4 p-4 pb-24">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h1
              data-testid="screen-title"
              className="text-[var(--fs-title)] font-bold text-[var(--color-text)]"
            >
              Nhiệm vụ tình nguyện viên
            </h1>
            <Link
              to="/tnv/ban-do"
              aria-label="Mở bản đồ nhiệm vụ"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
            >
              <MapIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Bản đồ</span>
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 shadow-xs">
            <label
              htmlFor="volunteer-select"
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]"
            >
              <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>TNV:</span>
            </label>
            <SelectField
              id="volunteer-select"
              aria-label="Chọn tình nguyện viên"
              value={currentVolunteer}
              onChange={(e) => handleVolunteerChange(e.target.value)}
              wrapperClassName="flex-1"
              className="bg-[var(--color-bg)] font-semibold"
            >
              {VOLUNTEERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectField>
          </div>
        </header>

        {toastMessage && (
          <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
        )}

        <Tabs
          tabs={[
            { id: 'todo', label: 'Cần làm', count: todoTasks.length },
            { id: 'done', label: 'Đã xong', count: doneTasks.length },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'todo' | 'done')}
        />

        {displayedTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck />}
            title="Hiện chưa có nhiệm vụ"
            description={
              activeTab === 'todo'
                ? 'Khi cán bộ phường phân công hoặc có điểm cần kiểm tra gần bạn, nhiệm vụ sẽ hiện tại đây.'
                : 'Các nhiệm vụ bạn đã hoàn thành xác minh sẽ được lưu ở đây.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {displayedTasks.map(({ task, report, distanceMeters }) => {
              const isVerify = task.type === 'xac_minh';
              const isOpen = task.assignee === null;
              const isDone = task.status === 'xong';

              return (
                <Card
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/tnv/${task.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/tnv/${task.id}`);
                    }
                  }}
                  className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isVerify
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isVerify ? 'Xác minh ban đầu' : 'Nghiệm thu sau xử lý'}
                    </span>

                    {isDone ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Đã xong
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                        Nhiệm vụ mở
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                        Đã giao cho bạn
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      {report?.title || getCategoryLabel(report)}
                    </h2>
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">
                      {task.reportId}
                    </span>
                  </div>

                  {report?.title && (
                    <div className="mt-0.5 text-xs font-semibold text-primary">
                      {getCategoryLabel(report)}
                    </div>
                  )}

                  {report?.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--color-text-muted)]">
                      {report.description}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-start gap-1.5 text-sm text-[var(--color-text-muted)]">
                    <MapPin
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    />
                    <span className="line-clamp-2">
                      {report?.address ?? 'Đang cập nhật địa chỉ'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5 text-xs text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1 font-medium text-primary-dark">
                      <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                      {report ? `Cách ${formatDistance(distanceMeters)}` : 'Chưa rõ khoảng cách'}
                    </span>
                    <span className="font-semibold text-primary">
                      {isDone ? 'Xem kết quả ›' : 'Thực hiện ›'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </VolunteerLayout>
  );
}
