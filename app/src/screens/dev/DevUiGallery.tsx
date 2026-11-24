import React, { useState, useMemo, useContext } from 'react';
import mockData from '@/data/mock.json';
import { DEMO_NOW, STATUS_CONFIGS, CATEGORY_CONFIGS } from '@/domain/constants';
import { Category, Status, Report } from '@/domain/types';
import { computeDelayDays } from '@/domain/latestUpdate';
import { AppStoreContext } from '@/store/AppStore';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Timeline } from '@/components/common/Timeline';
import { StepHeader } from '@/components/common/StepHeader';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { CategoryTile } from '@/components/citizen/CategoryTile';
import { LocationRow } from '@/components/citizen/LocationRow';
import { ReportCard } from '@/components/citizen/ReportCard';
import { LatestUpdate } from '@/components/citizen/LatestUpdate';
import { NotificationBell } from '@/components/citizen/NotificationBell';
import { SmsPreview } from '@/components/citizen/SmsPreview';
import { MockLabel } from '@/components/common/MockLabel';
import { TrackingLinkCard } from '@/components/citizen/TrackingLinkCard';
import { SubscribeCard } from '@/components/citizen/SubscribeCard';
import { RatingSheet } from '@/components/citizen/RatingSheet';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';

export const DevUiGallery: React.FC = () => {
  const storeContext = useContext(AppStoreContext);
  const demoNow = storeContext?.state?.settings?.demoNow || DEMO_NOW;
  const reports: Report[] = storeContext?.state?.reports?.length
    ? storeContext.state.reports
    : (mockData.reports as Report[]);

  // Lấy các hồ sơ đại diện theo thuộc tính (không hard-code ID)
  const reportMoi = reports.find((r) => r.status === 'moi')!;
  const reportDaTiepNhan = reports.find((r) => r.status === 'da_tiep_nhan')!;
  const reportQuaHan = reports.find(
    (r) => r.status === 'da_giao' && new Date(r.dueAt || '') < new Date(demoNow)
  )!;
  const reportDangXuLy =
    reports.find((r) => r.status === 'da_giao' && !r.completedAt && r.id !== reportQuaHan?.id) ||
    reportQuaHan;
  const reportMoLai = reports.find((r) => r.status === 'mo_lai')!;
  const reportDong = reports.find((r) => r.status === 'dong')!;
  const reportCanBoSung = reports.find((r) => r.status === 'can_bo_sung')!;

  // 10 markers cho MapView đảm bảo đủ cả 4 loại sự cố
  const mapReports = useMemo(() => {
    const selected: Report[] = [];
    const categories: Category[] = ['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong'];
    for (const cat of categories) {
      const found = reports.find((r) => r.category === cat && !selected.some((s) => s.id === r.id));
      if (found) selected.push(found);
    }
    for (const r of reports) {
      if (selected.length >= 10) break;
      if (!selected.some((s) => s.id === r.id)) {
        selected.push(r);
      }
    }
    return selected;
  }, [reports]);

  // State tương tác demo
  const [selectedCategory, setSelectedCategory] = useState<string>('den_duong');
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [subscribedPhone, setSubscribedPhone] = useState<string | undefined>();

  const allStatuses: Status[] = Object.keys(STATUS_CONFIGS) as Status[];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-gray-900 font-sans">
      {/* Header Dev */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">P3 UI Gallery</h1>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                DEV ONLY
              </span>
            </div>
            <p className="text-xs text-gray-500">Mốc thời gian: 24/11/2026 09:00:00 (+07:00)</p>
          </div>
          <NotificationBell
            notifications={[
              {
                id: 'N-DEV-1',
                phone: '0909000068',
                reportId: reportDaTiepNhan.id,
                message: 'Phường đã tiếp nhận phản ánh về đèn đường.',
                createdAt: '2026-11-24T10:30:00+07:00',
                read: false,
                channel: 'app',
              },
              {
                id: 'N-DEV-2',
                phone: '0909000068',
                reportId: reportDangXuLy.id,
                message: 'Sự cố mặt đường đã được chuyển giao cho Đội duy tu đường.',
                createdAt: '2026-11-22T08:15:00+07:00',
                read: true,
                channel: 'sms_mo_phong',
              },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-4 pt-6">
        {/* 1. StatusChip & DelayChip */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              1. StatusChip & DelayChip
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Nhãn công khai:</div>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((st) => (
                  <StatusChip key={`pub-${st}`} status={st} />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Biến thể cán bộ:</div>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((st) => (
                  <StatusChip key={`off-${st}`} status={st} variant="officer" />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">DelayChip (quá hạn):</div>
              <div className="flex flex-wrap gap-2">
                <DelayChip delayDays={1} />
                <DelayChip delayDays={2} />
                <DelayChip delayDays={3} />
                <span className="text-xs text-gray-400 italic self-center">
                  (delayDays ≤ 0 ẩn hoàn toàn)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ProgressBar & Timeline theo 6 hồ sơ */}
        <section className="space-y-4">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              2. ProgressBar & Timeline (6 hồ sơ đại diện)
            </h2>
          </div>

          {/* 2.1 Hồ sơ MỚI */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">HỒ SƠ MỚI (moi)</span>
              <span className="text-xs text-gray-500">{reportMoi.id}</span>
            </div>
            <ProgressBar report={reportMoi} />
            <Timeline report={reportMoi} now={demoNow} />
          </Card>

          {/* 2.2 Hồ sơ ĐÃ TIẾP NHẬN */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">
                HỒ SƠ ĐÃ TIẾP NHẬN (da_tiep_nhan)
              </span>
              <span className="text-xs text-gray-500">{reportDaTiepNhan.id}</span>
            </div>
            <ProgressBar report={reportDaTiepNhan} />
            <Timeline report={reportDaTiepNhan} now={demoNow} />
          </Card>

          {/* 2.3 Hồ sơ ĐÃ GIAO QUÁ HẠN */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-600">
                HỒ SƠ ĐÃ GIAO QUÁ HẠN (da_giao)
              </span>
              <span className="text-xs text-gray-500">{reportQuaHan.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status={reportQuaHan.status} />
              <DelayChip delayDays={computeDelayDays(reportQuaHan, demoNow)} />
            </div>
            <ProgressBar report={reportQuaHan} />
            <Timeline report={reportQuaHan} now={demoNow} />
          </Card>

          {/* 2.4 Hồ sơ MỞ LẠI */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600">HỒ SƠ MỞ LẠI (mo_lai)</span>
              <span className="text-xs text-gray-500">{reportMoLai.id}</span>
            </div>
            <ProgressBar report={reportMoLai} />
            <Timeline report={reportMoLai} now={demoNow} />
          </Card>

          {/* 2.5 Hồ sơ ĐÃ ĐÓNG */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">HỒ SƠ ĐÃ ĐÓNG (dong)</span>
              <span className="text-xs text-gray-500">{reportDong.id}</span>
            </div>
            <ProgressBar report={reportDong} />
            <Timeline report={reportDong} now={demoNow} />
          </Card>

          {/* 2.6 Hồ sơ CẦN BỔ SUNG */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">
                HỒ SƠ NGOẠI LỆ (can_bo_sung)
              </span>
              <span className="text-xs text-gray-500">{reportCanBoSung.id}</span>
            </div>
            <ProgressBar report={reportCanBoSung} />
            <Timeline report={reportCanBoSung} now={demoNow} />
          </Card>
        </section>

        {/* 3. BeforeAfter */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              3. BeforeAfter (Trước / Sau xử lý)
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Hồ sơ đã xử lý hoàn tất (có ảnh sau):
              </div>
              <BeforeAfter
                beforePhotos={reportDong.photos}
                afterPhotos={reportDong.resultPhotos}
                beforeTime={reportDong.createdAt}
                afterTime={reportDong.completedAt}
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Hồ sơ đang xử lý (chưa có ảnh sau):
              </div>
              <BeforeAfter
                beforePhotos={reportDangXuLy.photos}
                beforeTime={reportDangXuLy.createdAt}
                category={reportDangXuLy.category}
              />
            </div>
          </div>
        </section>

        {/* 4. ReportCard */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              4. ReportCard
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Thẻ phản ánh đang xử lý ({reportDangXuLy.id}):
              </div>
              <ReportCard report={reportDangXuLy} now={demoNow} />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Thẻ phản ánh đã hoàn thành ({reportDong.id}):
              </div>
              <ReportCard report={reportDong} now={demoNow} />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Thẻ phản ánh mới tiếp nhận ({reportMoi.id}):
              </div>
              <ReportCard report={reportMoi} now={demoNow} />
            </div>
          </div>
        </section>

        {/* 5. LatestUpdate */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              5. LatestUpdate
            </h2>
          </div>

          <div className="space-y-2">
            <LatestUpdate report={reportDangXuLy} now={demoNow} />
            <LatestUpdate report={reportMoLai} now={demoNow} />
            <LatestUpdate report={reportCanBoSung} now={demoNow} />
          </div>
        </section>

        {/* 6. CategoryTile */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              6. CategoryTile (Lưới 2×2)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_CONFIGS.map((cat) => (
              <CategoryTile
                key={cat.key}
                category={cat.key}
                selected={selectedCategory === cat.key}
                onSelect={(catKey) => setSelectedCategory(catKey)}
              />
            ))}
          </div>
        </section>

        {/* 7. LocationRow & StepHeader */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              7. LocationRow & StepHeader
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">
                LocationRow có nút Đổi:
              </div>
              <LocationRow
                address="15 Đường Nguyễn Trãi, KP. 1, P. Trấn Biên"
                onChange={() => alert('Chuyển sang màn chọn vị trí')}
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1.5">
                LocationRow chế độ chỉ đọc:
              </div>
              <LocationRow address="45 Đường Hưng Đạo Vương, KP. 2, P. Trấn Biên" />
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">StepHeader (3 bước):</div>
              <StepHeader currentStep={1} title="Chụp ảnh" onCancel={() => {}} />
              <div className="h-2" />
              <StepHeader currentStep={2} title="Vị trí sự cố" onCancel={() => {}} />
              <div className="h-2" />
              <StepHeader currentStep={3} title="Xác nhận & gửi" onCancel={() => {}} />
            </div>
          </div>
        </section>

        {/* 8. MapView 10 markers */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              8. MapView (10 markers từ mock data)
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <div className="h-80 w-full">
              <MapView
                center={[10.957, 106.828]}
                zoom={14}
                radiusCircle={{
                  center: [10.957, 106.828],
                  radiusMeters: 1000,
                }}
                markers={mapReports.map((r) => ({
                  id: r.id,
                  lat: r.lat,
                  lng: r.lng,
                  category: r.category,
                  status: r.status,
                  title: `${r.id} - ${r.address}`,
                  onClick: (id: string) => alert(`Chọn phản ánh: ${id}`),
                }))}
              />
            </div>
            <div className="border-t border-gray-100 p-3 text-xs text-gray-500">
              Hiển thị 10 hồ sơ ngẫu nhiên với icon Lucide theo loại, viền màu trạng thái, vòng bán
              kính 1 km và bảng chú giải có chữ.
            </div>
          </div>
        </section>

        {/* 9. TrackingLinkCard & SubscribeCard */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              9. TrackingLinkCard & SubscribeCard
            </h2>
          </div>

          <div className="space-y-4">
            <TrackingLinkCard
              reportId={reportDong.id}
              secretCode={reportDong.secretCode || '4821'}
              origin={typeof window !== 'undefined' ? window.location.origin : 'http://localhost'}
              showSecretDefault={true}
            />

            <SubscribeCard
              reportId={reportDong.id}
              currentPhone={subscribedPhone}
              onSubscribe={(p) => setSubscribedPhone(p)}
              onUnsubscribe={() => setSubscribedPhone(undefined)}
            />
          </div>
        </section>

        {/* 10. SmsPreview & MockLabel */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              10. SmsPreview & MockLabel
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Nhãn mô phỏng chuẩn:</span>
              <MockLabel />
            </div>

            <SmsPreview
              phone="0909 *** 068"
              sender="UBND P. Tran Bien"
              message={`UBND P. Tran Bien: Phan anh ${reportDaTiepNhan.id} ve den duong da duoc ${reportDaTiepNhan.department || 'Phong KT-HT&DT'} tiep nhan. Theo doi tai: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost'}/phan-anh/${reportDaTiepNhan.id}?k=1234`}
              time="10:30 Hôm nay"
            />
          </div>
        </section>

        {/* 11. RatingSheet & BottomSheet Interactive */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              11. RatingSheet & BottomSheet Demo
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col gap-2.5">
              <Button
                variant="primary"
                onClick={() => setIsRatingOpen(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                Mở RatingSheet (Đánh giá kết quả)
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsBottomSheetOpen(true)}
                className="w-full"
              >
                Mở BottomSheet Demo
              </Button>
            </div>
          </div>
        </section>

        {/* 12. EmptyState Demo */}
        <section className="space-y-3">
          <div className="border-b border-gray-200 pb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              12. EmptyState
            </h2>
          </div>

          <Card className="p-4">
            <EmptyState
              icon={<Inbox className="h-10 w-10 text-gray-400" />}
              title="Bạn chưa có phản ánh nào"
              description="Những phản ánh bạn đã gửi từ thiết bị này sẽ xuất hiện tại đây để tiện theo dõi tiến độ."
              actionText="Báo sự cố ngay"
              onAction={() => alert('Chuyển tới màn báo sự cố')}
            />
          </Card>
        </section>
      </main>

      {/* Sheets mở theo state */}
      <RatingSheet
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        onSubmit={(data) => {
          alert(`Đã gửi đánh giá: ${data.rating} sao - [${data.tags.join(', ')}]`);
          setIsRatingOpen(false);
        }}
      />

      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        title="Tiêu đề BottomSheet Mẫu"
        footer={
          <Button fullWidth onClick={() => setIsBottomSheetOpen(false)}>
            Đồng ý & Đóng
          </Button>
        }
      >
        <div className="py-4 text-xs text-gray-600 leading-relaxed">
          Đây là nội dung thử nghiệm trong BottomSheet với tay nắm bo tròn, cuộn mượt và nút cố định
          ở đáy đạt chiều cao 48px và vùng chạm ≥ 44px.
        </div>
      </BottomSheet>
    </div>
  );
};
