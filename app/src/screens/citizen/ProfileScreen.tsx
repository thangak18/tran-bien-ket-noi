import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, BarChart3, PhoneCall, User, LogOut } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { computeKpi } from '@/domain/kpi';
import { applySeniorMode } from '@/lib/senior';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const { settings, reports } = state;
  const userPhone = settings.phone;

  // Thống kê cá nhân
  const myReports = useMemo(() => {
    const deviceIds = new Set(settings.deviceReports.map((d) => d.id));
    return reports.filter(
      (r) => deviceIds.has(r.id) || (userPhone && r.followers.includes(userPhone))
    );
  }, [reports, settings.deviceReports, userPhone]);

  const countProcessing = myReports.filter(
    (r) => r.status !== 'hoan_thanh' && r.status !== 'dong'
  ).length;
  const countResolved = myReports.filter(
    (r) => r.status === 'hoan_thanh' || r.status === 'dong'
  ).length;

  // KPI tháng 11
  const kpi = useMemo(
    () => computeKpi(reports, '2026-11', settings.demoNow),
    [reports, settings.demoNow]
  );

  // Trạng thái modal
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [loginPhoneInput, setLoginPhoneInput] = useState('');
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [lookupPhone4, setLookupPhone4] = useState('');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Tên người dùng
  const displayName = userPhone === '0909000068' ? 'Ông Tư' : 'Người dân';
  const maskedPhone = userPhone ? userPhone.replace(/(\d{4})\d{3}(\d{3})/, '$1 *** $2') : '';

  const handleToggleSenior = (enabled: boolean) => {
    applySeniorMode(enabled);
    dispatch({ type: 'SET_SETTINGS', payload: { seniorMode: enabled } });
  };

  const handleLogout = () => {
    dispatch({ type: 'SET_SETTINGS', payload: { phone: undefined } });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhoneInput.trim()) {
      setIsOtpOpen(true);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = lookupId.trim().toUpperCase();
    if (cleanId) {
      setIsLookupOpen(false);
      navigate(`/phan-anh/${cleanId}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-12 min-h-screen bg-background">
      {/* Header */}
      <header className="py-1">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-xs text-gray-500">Cổng thông tin cư dân Phường Trấn Biên</p>
      </header>

      {/* KHỐI TÀI KHOẢN (Đã đăng nhập vs Chưa đăng nhập) */}
      {!userPhone ? (
        <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FF] text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Đăng nhập bằng số điện thoại</h2>
              <p className="text-[11px] text-gray-500">
                Đồng bộ phản ánh trên nhiều máy và nhận tin báo qua SMS/Zalo.
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-2 pt-1">
            <input
              type="tel"
              value={loginPhoneInput}
              onChange={(e) => setLoginPhoneInput(e.target.value)}
              placeholder="Nhập số điện thoại (VD: 0909 000 068)"
              className="w-full rounded-card border border-[#E5E7EB] bg-gray-50/50 p-2.5 text-xs text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
            />
            <p className="text-[11px] text-gray-400">
              SĐT chỉ dùng để báo tin, không hiển thị công khai.
            </p>

            <button
              type="submit"
              className="w-full rounded-btn bg-primary py-2.5 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all text-center"
            >
              Nhận mã OTP (Mô phỏng)
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold text-lg shadow-soft">
                {displayName.charAt(0)}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{displayName}</h2>
                <p className="text-xs text-gray-500 font-mono">{maskedPhone}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-btn border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>

          {/* 3 ô số thống kê */}
          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
            <div className="rounded-xl bg-gray-50 p-2">
              <div className="text-base font-black text-gray-900">{myReports.length}</div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Đã gửi</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-2">
              <div className="text-base font-black text-amber-600">{countProcessing}</div>
              <div className="text-[10px] font-semibold text-amber-700 uppercase">Đang xử lý</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2">
              <div className="text-base font-black text-emerald-600">{countResolved}</div>
              <div className="text-[10px] font-semibold text-emerald-700 uppercase">Đã xử lý</div>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH MỤC CÀI ĐẶT & TIỆN ÍCH */}
      <div className="rounded-card border border-[#E5E7EB] bg-white shadow-soft divide-y divide-gray-100 overflow-hidden">
        {/* Mục 1: Tra cứu bằng mã phản ánh */}
        <button
          type="button"
          onClick={() => setIsLookupOpen(true)}
          className="flex w-full items-center justify-between p-3.5 text-left hover:bg-gray-50/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Tra cứu bằng mã phản ánh</p>
              <p className="text-[11px] text-gray-500">Nhập mã TB-xxxx + 4 số cuối SĐT</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>

        {/* Mục 2: Kết quả xử lý của phường */}
        <button
          type="button"
          onClick={() => navigate('/minh-bach')}
          className="flex w-full items-center justify-between p-3.5 text-left hover:bg-gray-50/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Kết quả xử lý của phường</p>
              <p className="text-[11px] text-gray-500">
                Tháng 11: {kpi.resolved}/{kpi.total} phản ánh đã xử lý
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>

        {/* Mục 3: Chế độ chữ lớn (Người cao tuổi) */}
        <div className="flex w-full items-center justify-between p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">
              Aa
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Chế độ chữ lớn (Người cao tuổi)</p>
              <p className="text-[11px] text-gray-500">Tăng cỡ chữ và nút bấm cho dễ nhìn</p>
            </div>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={Boolean(settings.seniorMode)}
              onChange={(e) => handleToggleSenior(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-primary peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>

        {/* Mục 4: Gọi tổng đài phường */}
        <button
          type="button"
          onClick={() => setIsCallModalOpen(true)}
          className="flex w-full items-center justify-between p-3.5 text-left hover:bg-gray-50/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900">Gọi tổng đài phường</span>
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
                  Mô phỏng
                </span>
              </div>
              <p className="text-[11px] text-gray-500">1900 1234 (Miễn cước, 24/7)</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Sheet Tra cứu mã phản ánh */}
      <BottomSheet
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        title="Tra cứu phản ánh"
      >
        <form onSubmit={handleLookupSubmit} className="space-y-3 py-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Mã phản ánh</label>
            <input
              type="text"
              required
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="VD: TB-0001"
              className="w-full rounded-card border border-[#E5E7EB] p-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              4 số cuối SĐT (nếu có đăng ký)
            </label>
            <input
              type="text"
              maxLength={4}
              value={lookupPhone4}
              onChange={(e) => setLookupPhone4(e.target.value)}
              placeholder="VD: 0068"
              className="w-full rounded-card border border-[#E5E7EB] p-2.5 text-xs text-gray-900 focus:border-primary focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-btn bg-primary py-2.5 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95"
          >
            Tra cứu ngay
          </button>
        </form>
      </BottomSheet>

      {/* Modal Gọi tổng đài phường mô phỏng */}
      <Modal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        title="Tổng đài Phường Trấn Biên"
      >
        <div className="text-center py-4 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <PhoneCall className="h-7 w-7" />
          </div>

          <div>
            <span className="font-mono text-2xl font-black text-emerald-700">1900 1234</span>
            <p className="mt-1 text-xs text-gray-500">
              Tổng đài tiếp nhận thông tin phản ánh hiện trường (Mô phỏng)
            </p>
          </div>

          <div className="rounded-card bg-gray-50 p-3 text-xs text-gray-600 text-left">
            <p className="font-semibold text-gray-900">• Thời gian hoạt động: 24/7</p>
            <p className="mt-0.5">
              • Cán bộ trực ban sẽ ghi nhận và điều phối lực lượng xử lý khẩn cấp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCallModalOpen(false)}
            className="w-full rounded-btn bg-gray-100 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200"
          >
            Đóng
          </button>
        </div>
      </Modal>

      {/* Sheet OTP khi đăng nhập */}
      <PhoneOtpSheet
        isOpen={isOtpOpen}
        initialPhone={loginPhoneInput}
        onClose={() => setIsOtpOpen(false)}
        onVerified={(verifiedPhone) => {
          dispatch({ type: 'SET_SETTINGS', payload: { phone: verifiedPhone } });
          setIsOtpOpen(false);
          setLoginPhoneInput('');
        }}
        title="Xác thực số điện thoại cư dân"
      />
    </div>
  );
}
