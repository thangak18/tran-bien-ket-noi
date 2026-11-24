import { useNavigate } from 'react-router-dom';
import { Camera, FileText, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { ReportCard } from '@/components/citizen/ReportCard';
import { Button } from '@/components/ui/Button';

export function C05Mine() {
  const navigate = useNavigate();
  const { state } = useAppStore();

  const now = state.settings.demoNow;
  const deviceReports = state.settings.deviceReports || [];
  const userPhone = state.settings.phone;

  // Lấy danh sách phản ánh của người dùng (theo thiết bị hoặc số điện thoại)
  const myReports = state.reports.filter((r) => {
    if (deviceReports.some((d) => d.id === r.id)) return true;
    if (userPhone && r.reporterPhone === userPhone) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 shadow-2xs">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900" data-testid="screen-title">
              Phản ánh của tôi
            </h1>
            <p className="text-xs text-gray-500">
              {myReports.length > 0
                ? `${myReports.length} phản ánh đã gửi từ thiết bị này`
                : 'Theo dõi tiến độ xử lý của bạn'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/bao-su-co/anh')}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-primary-dark"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Gửi mới</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-3">
        {myReports.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-2xs">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Chưa có phản ánh nào</h2>
            <p className="mt-1 text-xs text-gray-500 max-w-[240px]">
              Khi bạn chụp ảnh báo sự cố tại Phường Trấn Biên, hồ sơ sẽ hiển thị tại đây để bạn tiện
              theo dõi.
            </p>

            <Button
              className="mt-5 flex items-center gap-2"
              onClick={() => navigate('/bao-su-co/anh')}
            >
              <Camera className="h-4 w-4" />
              <span>Báo sự cố ngay</span>
            </Button>
          </div>
        ) : (
          myReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              now={now}
              onClick={() => navigate(`/phan-anh/${report.id}`)}
            />
          ))
        )}

        {/* Khối xem kết quả chung */}
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/minh-bach')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Xem bảng minh bạch kết quả toàn phường</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </main>
    </div>
  );
}
