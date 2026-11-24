import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Plus,
  Lightbulb,
  Droplets,
  Trash2,
  Construction,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { submitReport } from '@/store/citizenActions';
import { Category } from '@/domain/types';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { nearestStreet } from '@/data/streets';
import { CategoryIcon } from '@/components/common/CategoryIcon';

const CATEGORY_ITEMS: { key: Category; label: string; icon: React.ReactNode }[] = [
  { key: 'den_duong', label: 'Đèn đường', icon: <Lightbulb className="h-6 w-6 text-amber-500" /> },
  { key: 'ngap_nuoc', label: 'Ngập nước', icon: <Droplets className="h-6 w-6 text-blue-500" /> },
  { key: 'rac_thai', label: 'Rác thải', icon: <Trash2 className="h-6 w-6 text-emerald-600" /> },
  {
    key: 'mat_duong',
    label: 'Mặt đường',
    icon: <Construction className="h-6 w-6 text-orange-500" />,
  },
];

export function C04Confirm() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const photos = state.draft?.photos || [];
  const primaryPhoto = photos[0] || '';
  const [primaryImgError, setPrimaryImgError] = useState(false);
  const [thumbErrors, setThumbErrors] = useState<Record<number, boolean>>({});

  const [category, setCategory] = useState<Category | null>(state.draft?.category || null);
  const [address, setAddress] = useState<string>(state.draft?.address || '');
  const [lat, setLat] = useState<number | null>(state.draft?.lat || null);
  const [lng, setLng] = useState<number | null>(state.draft?.lng || null);
  const [isGpsAuto, setIsGpsAuto] = useState<boolean>(false);

  const [description, setDescription] = useState<string>(state.draft?.description || '');
  const [phone, setPhone] = useState<string>(state.settings.phone || '');
  const [isOtpOpen, setIsOtpOpen] = useState<boolean>(false);
  const [otpTargetPhone, setOtpTargetPhone] = useState<string>('');

  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  // Tự lấy GPS khi vào màn hình nếu chưa có vị trí
  useEffect(() => {
    if (!state.draft?.address && !lat) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const uLat = pos.coords.latitude;
            const uLng = pos.coords.longitude;
            setLat(uLat);
            setLng(uLng);
            const nearest = nearestStreet(uLat, uLng);
            setAddress(`Đường ${nearest.name}, Phường Trấn Biên`);
            setIsGpsAuto(true);
            dispatch({
              type: 'SET_DRAFT',
              payload: { lat: uLat, lng: uLng, address: `Đường ${nearest.name}, Phường Trấn Biên` },
            });
          },
          () => {
            // Lỗi hoặc từ chối GPS -> để trống để hiện trạng thái "Chưa xác định"
            setLat(null);
            setLng(null);
            setAddress('');
          },
          { timeout: 3500 }
        );
      }
    } else {
      if (state.draft?.lat) setLat(state.draft.lat);
      if (state.draft?.lng) setLng(state.draft.lng);
      if (state.draft?.address) setAddress(state.draft.address);
    }
  }, [state.draft, lat, dispatch]);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && photos.length < 5) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const updated = [...photos, result];
          dispatch({ type: 'SET_DRAFT', payload: { photos: updated } });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const executeSubmit = (submitPhone: string, isAnon: boolean) => {
    if (!category || !lat || !lng || !address) return;

    const payload = {
      category,
      photos: photos.length > 0 ? photos : [primaryPhoto],
      lat,
      lng,
      address,
      description: description.trim() || undefined,
      phone: !isAnon && submitPhone ? submitPhone : undefined,
      anonymous: isAnon,
    };

    const res = submitReport(state, payload, state.settings.demoNow);
    dispatch({ type: 'HYDRATE', payload: res.state });
    dispatch({ type: 'CLEAR_DRAFT' });

    // Chuyển về tab Cá nhân với state thông báo thành công
    navigate('/?tab=ca-nhan', {
      replace: true,
      state: {
        justSubmitted: {
          reportId: res.report.id,
          secretCode: res.report.secretCode,
          anonymous: isAnon,
        },
      },
    });
  };

  const handleStartSubmit = () => {
    if (!lat || !address || !category) return;

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone) {
      // Có SĐT -> mở OTP
      setOtpTargetPhone(cleanPhone);
      setIsOtpOpen(true);
    } else {
      // Không có SĐT -> Gửi ẩn danh
      executeSubmit('', true);
    }
  };

  const handleOtpVerified = (verifiedPhone: string) => {
    setIsOtpOpen(false);
    executeSubmit(verifiedPhone, false);
  };

  // Xác định trạng thái nút gửi
  const hasLocation = Boolean(lat && address);
  const hasCategory = Boolean(category);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col justify-between">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Bước 3: Xác nhận & gửi
      </h1>

      {/* Header ← + "{n}/5 ảnh" */}
      <header className="relative z-10 flex h-14 items-center justify-between px-4 pt-2 text-white">
        <button
          type="button"
          onClick={() => navigate('/bao-su-co/anh')}
          aria-label="Quay lại"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h2 className="text-sm font-semibold tracking-wide">Xác nhận gửi</h2>

        <span className="text-xs font-medium text-gray-300">{photos.length || 1}/5 ảnh</span>
      </header>

      {/* Ảnh lớn phía trên + Dải ảnh nhỏ */}
      <div className="px-4 pb-3">
        <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-md">
          {primaryPhoto && !primaryImgError ? (
            <img
              src={primaryPhoto}
              alt="Hiện trường"
              className="h-full w-full object-cover"
              onError={() => setPrimaryImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gray-800 text-gray-400">
              <CategoryIcon
                category={category || 'mat_duong'}
                className="h-10 w-10 text-gray-400"
              />
              <span className="text-xs font-medium text-gray-300 mt-1.5">Chưa có ảnh</span>
            </div>
          )}
        </div>

        {/* Dải ảnh nhỏ + nút "+" */}
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {photos.map((p, idx) => (
            <div
              key={idx}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-gray-800"
            >
              {p && !thumbErrors[idx] ? (
                <img
                  src={p}
                  alt={`Ảnh ${idx + 1}`}
                  className="h-full w-full object-cover"
                  onError={() => setThumbErrors((prev) => ({ ...prev, [idx]: true }))}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-800 text-gray-400">
                  <CategoryIcon
                    category={category || 'mat_duong'}
                    className="h-4 w-4 text-gray-400"
                  />
                  <span className="text-[7px] font-medium text-gray-400">Chưa có ảnh</span>
                </div>
              )}
            </div>
          ))}

          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => addPhotoInputRef.current?.click()}
              aria-label="Thêm ảnh"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-400 bg-white/10 text-gray-300 hover:bg-white/20"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          <input
            ref={addPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAddPhoto}
          />
        </div>
      </div>

      {/* Sheet trắng bo góc trên */}
      <div className="rounded-t-[24px] bg-white p-5 shadow-2xl flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          {/* 1. Thanh bước nhỏ ① Ảnh ✓ ② Vị trí ③ Loại (BẮT BUỘC) */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 text-[11px] font-semibold text-gray-400">
            <span className="text-emerald-600 flex items-center gap-1">① Ảnh ✓</span>
            <span className="h-0.5 w-6 bg-gray-200" />
            <span className={hasLocation ? 'text-primary font-bold' : 'text-gray-400'}>
              ② Vị trí {hasLocation && '✓'}
            </span>
            <span className="h-0.5 w-6 bg-gray-200" />
            <span className={hasCategory ? 'text-primary font-bold' : 'text-gray-400'}>
              ③ Loại {hasCategory && '✓'}
            </span>
          </div>

          {/* 2. Loại phản ánh (Lưới 2x2 tile) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Loại phản ánh <span className="text-red-500">*</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_ITEMS.map((item) => {
                const isSelected = category === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item.key)}
                    className={`flex items-center gap-2.5 rounded-card p-3 text-left transition-all ${
                      isSelected
                        ? 'border-2 border-primary bg-[#EFF4FF] shadow-soft'
                        : 'border border-[#E5E7EB] bg-white hover:bg-gray-50 shadow-soft'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-primary' : 'text-gray-800'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Vị trí phản ánh */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Vị trí phản ánh <span className="text-red-500">*</span>
            </h3>

            {hasLocation ? (
              <div className="flex items-center justify-between rounded-card border border-[#E5E7EB] bg-white p-3 shadow-soft">
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900">{address}</p>
                    <p className="text-[11px] text-gray-500">
                      {isGpsAuto ? 'Tự động GPS' : `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/bao-su-co/vi-tri')}
                  className="rounded-btn px-2.5 py-1 text-xs font-bold text-primary hover:bg-[#EFF4FF] transition-colors shrink-0"
                >
                  Đổi
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-card border border-amber-300 bg-amber-50 p-3 shadow-soft">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Chưa xác định được vị trí</p>
                    <p className="text-[11px] text-amber-700">
                      Nhấn để chọn trên bản đồ hoặc nhập đường
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/bao-su-co/vi-tri')}
                  className="rounded-btn bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-soft shrink-0"
                >
                  Chọn
                </button>
              </div>
            )}
          </div>

          {/* 4. Mô tả & Liên hệ */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="report-desc"
                className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"
              >
                Mô tả (tùy chọn)
              </label>
              <textarea
                id="report-desc"
                rows={2}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn (tùy chọn, ≤ 300 ký tự)..."
                className="w-full rounded-card border border-[#E5E7EB] bg-gray-50/50 p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="report-phone"
                className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"
              >
                Số điện thoại nhận tin
              </label>
              <input
                id="report-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại nhận tin (VD: 0909 000 068)"
                className="w-full rounded-card border border-[#E5E7EB] bg-gray-50/50 p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Để trống = gửi ẩn danh. SĐT không hiển thị công khai.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Nút "Gửi phản ánh" */}
        <div className="pt-2">
          {!hasLocation ? (
            <button
              type="button"
              disabled
              className="w-full rounded-btn bg-gray-200 py-3 text-xs font-bold text-gray-400 cursor-not-allowed text-center"
            >
              Chọn vị trí để gửi
            </button>
          ) : !hasCategory ? (
            <button
              type="button"
              disabled
              className="w-full rounded-btn bg-gray-200 py-3 text-xs font-bold text-gray-400 cursor-not-allowed text-center"
            >
              Chọn loại để gửi
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSubmit}
              className="w-full rounded-btn bg-primary py-3 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all text-center"
            >
              Gửi phản ánh
            </button>
          )}
        </div>
      </div>

      {/* Sheet OTP khi có SĐT */}
      <PhoneOtpSheet
        isOpen={isOtpOpen}
        initialPhone={otpTargetPhone}
        onClose={() => setIsOtpOpen(false)}
        onVerified={handleOtpVerified}
        title="Xác thực số điện thoại nhận tin"
      />
    </div>
  );
}
