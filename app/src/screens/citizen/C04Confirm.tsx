import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { submitReport } from '@/store/citizenActions';
import { Category, Report } from '@/domain/types';
import { StepHeader } from '@/components/common/StepHeader';
import { CategoryTile } from '@/components/citizen/CategoryTile';
import { LocationRow } from '@/components/citizen/LocationRow';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { Button } from '@/components/ui/Button';
import { WARD_CENTER } from '@/data/streets';

export function C04Confirm() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const photo = state.draft?.photos?.[0] || '/demo-photos/mat_duong/1.jpg';
  const address = state.draft?.address || 'Đường Cách Mạng Tháng Tám, Phường Trấn Biên';
  const lat = state.draft?.lat || WARD_CENTER.lat;
  const lng = state.draft?.lng || WARD_CENTER.lng;

  const [category, setCategory] = useState<Category | null>(state.draft?.category || null);
  const [description, setDescription] = useState<string>(state.draft?.description || '');
  const [isOtpOpen, setIsOtpOpen] = useState<boolean>(false);
  const [createdReport, setCreatedReport] = useState<Report | null>(null);

  const doSubmit = (phone: string) => {
    if (!category) return;

    const payload = {
      category,
      photos: [photo],
      lat,
      lng,
      address,
      locationNote: state.draft?.locationNote,
      description: description.trim() || undefined,
      phone,
      anonymous: false,
    };

    const res = submitReport(state, payload, state.settings.demoNow);
    dispatch({ type: 'HYDRATE', payload: res.state });
    dispatch({ type: 'CLEAR_DRAFT' });
    setCreatedReport(res.report);
  };

  const handleSend = () => {
    if (!category) return;
    if (state.settings.phone) {
      doSubmit(state.settings.phone);
    } else {
      setIsOtpOpen(true);
    }
  };

  const handleOtpVerified = (verifiedPhone: string) => {
    setIsOtpOpen(false);
    doSubmit(verifiedPhone);
  };

  // Màn hình thành công sau khi gửi
  if (createdReport) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 px-4 py-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between">
          <div className="w-full text-center pt-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <h1 className="text-xl font-bold text-gray-900">Phường đã nhận phản ánh</h1>
            <p className="mt-1 text-sm text-gray-500">Mã theo dõi của bạn:</p>

            <div className="mt-3 inline-block rounded-2xl bg-primary-50 px-6 py-3 border border-primary-200">
              <span className="font-mono text-3xl font-extrabold tracking-wider text-primary">
                {createdReport.id}
              </span>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-4 text-left border border-gray-100 shadow-2xs space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase">Tiếp theo là gì?</div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Cán bộ tiếp nhận sẽ kiểm tra hiện trường và phân công đơn vị xử lý trong vòng 24 giờ
                làm việc.
              </p>
              <p className="text-xs text-gray-500">
                Bạn sẽ nhận được thông báo ngay khi có tiến độ mới.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3 pt-6">
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate(`/phan-anh/${createdReport.id}`)}
              className="flex items-center justify-center gap-2"
            >
              <span>Theo dõi tiến độ phản ánh</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              <Home className="h-4 w-4" />
              <span>Về trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-8">
      <StepHeader
        currentStep={3}
        title="Xác nhận & gửi"
        onBack={() => navigate('/bao-su-co/vi-tri')}
        onCancel={() => navigate('/')}
      />

      <main className="flex-1 px-4 py-4 flex flex-col justify-between max-w-md mx-auto w-full">
        <div className="space-y-4">
          {/* Ảnh vừa chụp cao 120px */}
          <div className="relative h-[120px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-2xs">
            <img
              src={photo}
              alt="Ảnh sự cố"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120"><rect fill="%23e5e7eb" width="400" height="120"/><text fill="%236b7280" font-family="sans-serif" font-size="14" dy="5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh hiện trường</text></svg>';
              }}
            />
            <button
              type="button"
              onClick={() => navigate('/bao-su-co/anh')}
              className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs hover:bg-black/80 flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Đổi ảnh
            </button>
          </div>

          {/* Chọn loại sự cố: 4 ô vuông */}
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Đây là sự cố loại nào? <span className="text-red-500">*</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <CategoryTile
                category="den_duong"
                selected={category === 'den_duong'}
                onSelect={(cat) => setCategory(cat)}
              />
              <CategoryTile
                category="ngap_nuoc"
                selected={category === 'ngap_nuoc'}
                onSelect={(cat) => setCategory(cat)}
              />
              <CategoryTile
                category="rac_thai"
                selected={category === 'rac_thai'}
                onSelect={(cat) => setCategory(cat)}
              />
              <CategoryTile
                category="mat_duong"
                selected={category === 'mat_duong'}
                onSelect={(cat) => setCategory(cat)}
              />
            </div>
          </div>

          {/* Địa chỉ & mô tả */}
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Địa điểm ghi nhận</h3>
            <LocationRow address={address} onChange={() => navigate('/bao-su-co/vi-tri')} />

            <div>
              <label htmlFor="report-desc" className="block text-xs font-medium text-gray-700 mb-1">
                Mô tả thêm tình trạng (không bắt buộc)
              </label>
              <textarea
                id="report-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: Đèn chớp tắt liên tục từ tối qua..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
          <Button fullWidth size="lg" disabled={!category} onClick={handleSend}>
            Gửi cho phường
          </Button>
          <p className="text-center text-xs text-gray-400">
            Xác thực OTP nhanh chóng · Thông tin được bảo mật
          </p>
        </div>
      </main>

      <PhoneOtpSheet
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        onVerified={handleOtpVerified}
        title="Nhập số điện thoại để nhận thông báo"
      />
    </div>
  );
}
