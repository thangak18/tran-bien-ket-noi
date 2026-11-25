import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { isApiMode } from '@/data';
import { ActionError } from '@/components/common/ActionError';
import { AiSuggestionData, Category } from '@/domain/types';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { nearestStreet } from '@/data/streets';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { findDuplicates } from '@/domain/duplicates';

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
  const ds = useDataSource();
  const submitAction = useAction();

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

  // AI gợi ý loại sự cố từ ảnh
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestionData | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<boolean>(false);

  useEffect(() => {
    if (!primaryPhoto) {
      setAiSuggestion(null);
      setAiLoading(false);
      setAiError(false);
      return;
    }

    let cancelled = false;
    setAiLoading(true);
    setAiError(false);

    ds.suggestCategory(primaryPhoto)
      .then((res) => {
        if (cancelled) return;
        setAiSuggestion(res);
        setAiLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAiError(true);
        setAiLoading(false);
        setAiSuggestion(null);
      });

    return () => {
      cancelled = true;
    };
  }, [primaryPhoto, ds]);

  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  // B2 Cảnh báo trùng (spec 3.5)
  const duplicates = useMemo(() => {
    if (!category || !lat || !lng) return [];
    return findDuplicates({ category, lat, lng }, state.reports, state.settings.demoNow);
  }, [category, lat, lng, state.reports, state.settings.demoNow]);
  const topDup = duplicates[0];

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

  // Khoá chống gửi trùng khi nhấn nhanh nhiều lần (một lần gửi dùng một Idempotency-Key).
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const executeSubmit = async (submitPhone: string, isAnon: boolean) => {
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
      aiSuggestion: aiSuggestion ?? undefined,
    };

    // Lỗi (mất mạng, 4xx/5xx) được báo ngay trên màn hình và giữ nguyên bản nháp để thử lại;
    // không bao giờ âm thầm lưu cục bộ thay cho API.
    const res = await submitAction.run(() =>
      ds.createReport(payload, { idempotencyKey: idempotencyKey.current })
    );
    if (!res) return;

    if (isApiMode()) {
      dispatch({
        type: 'SET_SETTINGS',
        payload: {
          deviceReports: [
            ...(state.settings.deviceReports || []),
            {
              id: res.report.id,
              secretCode: res.secretCode || '',
              code: res.report.id,
              ownerToken: res.ownerToken || '',
            },
          ],
        },
      });
      dispatch({ type: 'ADD_REPORT', payload: { report: res.report } });
    }
    dispatch({ type: 'CLEAR_DRAFT' });
    idempotencyKey.current = crypto.randomUUID();

    navigate('/?tab=ca-nhan', {
      replace: true,
      state: {
        justSubmitted: {
          reportId: res.report.id,
          secretCode: res.secretCode,
          ...(isApiMode() ? { ownerToken: res.ownerToken } : {}),
          anonymous: isAnon,
        },
      },
    });
  };

  const handleStartSubmit = () => {
    if (!lat || !address || !category) return;

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (cleanPhone) {
      setOtpTargetPhone(cleanPhone);
      setIsOtpOpen(true);
    } else {
      executeSubmit('', true);
    }
  };

  const handleOtpVerified = (verifiedPhone: string) => {
    setIsOtpOpen(false);
    executeSubmit(verifiedPhone, false);
  };

  const hasLocation = Boolean(lat && address);
  const hasCategory = Boolean(category);

  const renderAiBanner = () => {
    if (aiLoading) {
      return (
        <div
          data-testid="ai-suggestion-loading"
          className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 flex items-center gap-2 text-xs text-blue-800 animate-pulse"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold shrink-0">
            ✨
          </span>
          <span className="font-medium">Đang phân tích ảnh...</span>
        </div>
      );
    }

    if (aiError || (aiSuggestion && (!aiSuggestion.category || aiSuggestion.confidence < 0.5))) {
      return (
        <div
          data-testid="ai-suggestion-unrecognized"
          className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 flex items-center justify-between text-xs text-amber-900"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white font-bold shrink-0">
              ℹ️
            </span>
            <span className="font-medium">Không nhận ra loại sự cố, bạn chọn giúp nhé</span>
          </div>
          <span className="text-[10px] text-amber-700 bg-amber-100/80 rounded px-1.5 py-0.5 font-medium">
            Tùy chọn
          </span>
        </div>
      );
    }

    if (aiSuggestion && aiSuggestion.category && aiSuggestion.confidence >= 0.5) {
      const suggestedItem = CATEGORY_ITEMS.find((c) => c.key === aiSuggestion.category);
      const label = suggestedItem?.label || aiSuggestion.category;
      const isSelected = category === aiSuggestion.category;
      const isDeepSeek = aiSuggestion.provider === 'deepseek';

      return (
        <div
          data-testid="ai-suggestion-banner"
          className="rounded-xl border border-blue-200 bg-blue-50/90 p-2.5 flex flex-col gap-2 text-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold shrink-0 mt-0.5">
                ✨
              </span>
              <div>
                <div className="font-semibold text-blue-950">
                  AI gợi ý: <span className="text-primary font-bold">{label}</span>
                  {aiSuggestion.reason && (
                    <span className="text-gray-600 font-normal"> – {aiSuggestion.reason}</span>
                  )}
                </div>
              </div>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isDeepSeek ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isDeepSeek ? 'Gợi ý bởi AI – vui lòng kiểm tra lại' : 'Gợi ý mô phỏng'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-blue-100/60">
            <span className="text-[10px] text-gray-500 italic">
              Ảnh được gửi tới dịch vụ AI (DeepSeek) để gợi ý loại sự cố
            </span>
            {!isSelected ? (
              <button
                type="button"
                onClick={() => setCategory(aiSuggestion.category!)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 transition-colors shadow-2xs shrink-0 ml-2"
              >
                Dùng gợi ý
              </button>
            ) : (
              <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 shrink-0 ml-2">
                ✓ Đang chọn
              </span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-between font-sans">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Bước 3: Xác nhận & gửi
      </h1>

      {/* ======================================================== */}
      {/* 1. BỐ CỤC MOBILE & TABLET (< 1024px)                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-between bg-[#111111] lg:hidden">
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
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
              >
                {p && !thumbErrors[idx] ? (
                  <img
                    src={p}
                    alt={`Ảnh ${idx + 1}`}
                    className="h-full w-full object-cover"
                    onError={() => setThumbErrors((prev) => ({ ...prev, [idx]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 text-gray-500">
                    <CategoryIcon
                      category={category || 'mat_duong'}
                      className="h-5 w-5 text-gray-500"
                    />
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
          </div>

          {/* Ghi chú bảo mật AI */}
          <p className="mt-1.5 text-[11px] text-gray-400">
            Ảnh được gửi tới dịch vụ AI (DeepSeek) để gợi ý loại sự cố
          </p>
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

            {/* B1 AI gợi ý: Băng nằm trong sheet, ngay trên lưới 4 loại */}
            {renderAiBanner()}

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
                      <span className="text-xs font-bold text-gray-900">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Vị trí phản ánh */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Vị trí <span className="text-red-500">*</span>
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/bao-su-co/vi-tri')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {hasLocation ? 'Đổi vị trí' : 'Chọn vị trí'}
                </button>
              </div>

              {hasLocation ? (
                <div className="flex items-center gap-2.5 rounded-card border border-[#E5E7EB] bg-gray-50 p-3 shadow-soft">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">{address}</p>
                    <p className="text-[11px] text-gray-400">
                      {isGpsAuto ? 'Vị trí hiện tại qua GPS' : 'Vị trí đã chọn trên bản đồ'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-card border-2 border-dashed border-amber-300 bg-amber-50/70 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Chưa xác định vị trí</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-700">
                    Vui lòng bật GPS hoặc chọn vị trí trên bản đồ để phường tiếp nhận.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/bao-su-co/vi-tri')}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-btn bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-amber-700"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Chọn vị trí ngay</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Mô tả chi tiết & SĐT */}
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

          {/* B2 Cảnh báo trùng: Thẻ cam nằm trong sheet, ngay trên nút Gửi */}
          {topDup && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-soft space-y-1">
              <div className="flex items-center justify-between gap-1.5 font-bold text-amber-950">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Có sự cố tương tự gần đây ({Math.round(topDup.distanceMeters)}m)</span>
                </div>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] text-amber-900 font-semibold shrink-0">
                  Gợi ý mô phỏng
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Hồ sơ #{topDup.report.id} ({topDup.report.address}) đang được xử lý. Bạn có thể tiếp
                tục gửi hoặc theo dõi hồ sơ này.
              </p>
            </div>
          )}

          {/* 5. Nút "Gửi phản ánh" */}
          <ActionError message={submitAction.error} onDismiss={submitAction.clearError} />
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
                disabled={submitAction.pending}
                onClick={handleStartSubmit}
                className="w-full rounded-btn bg-primary py-3 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all text-center"
              >
                {submitAction.pending ? 'Đang gửi...' : 'Gửi phản ánh'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BỐ CỤC DESKTOP (>= 1024px): 1 Thẻ trắng max 960px 2 cột */}
      {/* ======================================================== */}
      <div className="hidden lg:block w-full max-w-[960px] mx-auto py-8 px-4 flex-1">
        <div className="rounded-card border border-[#E5E7EB] bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Gửi phản ánh hiện trường</h2>
              <p className="text-xs text-gray-500">
                UBND Phường Trấn Biên tiếp nhận và điều phối giải quyết nhanh chóng
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              ✕ Huỷ bỏ
            </button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* CỘT TRÁI (5/12): Ảnh */}
            <div className="col-span-5 flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Hình ảnh hiện trường
              </label>

              {photos.length === 0 ? (
                /* Ô tải ảnh kéo thả / bấm chọn */
                <div
                  onClick={() => addPhotoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center h-64 rounded-card border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-primary hover:bg-[#EFF4FF]/50 transition-all cursor-pointer"
                >
                  <Plus className="h-8 w-8 text-primary mb-2" />
                  <p className="text-xs font-bold text-gray-800">Chọn ảnh hoặc kéo thả vào đây</p>
                  <p className="text-[11px] text-gray-400 mt-1">Hỗ trợ tối đa 5 ảnh (PNG, JPG)</p>
                </div>
              ) : (
                /* Ảnh lớn đã chọn + dải thumbnail */
                <div>
                  <div className="relative h-60 w-full overflow-hidden rounded-card border border-gray-200 bg-gray-100 shadow-soft">
                    {primaryPhoto && !primaryImgError ? (
                      <img
                        src={primaryPhoto}
                        alt="Hiện trường"
                        className="h-full w-full object-cover"
                        onError={() => setPrimaryImgError(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 text-gray-400">
                        <CategoryIcon
                          category={category || 'mat_duong'}
                          className="h-10 w-10 text-gray-400"
                        />
                        <span className="text-xs font-medium text-gray-500 mt-1.5">
                          Chưa có ảnh
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail nhỏ */}
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                      >
                        {p && !thumbErrors[idx] ? (
                          <img
                            src={p}
                            alt={`Ảnh ${idx + 1}`}
                            className="h-full w-full object-cover"
                            onError={() => setThumbErrors((prev) => ({ ...prev, [idx]: true }))}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 text-gray-500">
                            <CategoryIcon
                              category={category || 'mat_duong'}
                              className="h-6 w-6 text-gray-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {photos.length < 5 && (
                      <button
                        type="button"
                        onClick={() => addPhotoInputRef.current?.click()}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-primary hover:text-primary"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Ghi chú bảo mật AI */}
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    Ảnh được gửi tới dịch vụ AI (DeepSeek) để gợi ý loại sự cố
                  </p>
                </div>
              )}
            </div>

            {/* CỘT PHẢI (7/12): Form thông tin */}
            <div className="col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* 1. Thanh bước nhỏ */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 text-[11px] font-semibold text-gray-400">
                  <span
                    className={
                      photos.length > 0
                        ? 'text-emerald-600 flex items-center gap-1'
                        : 'text-gray-400'
                    }
                  >
                    ① Ảnh {photos.length > 0 && '✓'}
                  </span>
                  <span className="h-0.5 w-6 bg-gray-200" />
                  <span className={hasLocation ? 'text-primary font-bold' : 'text-gray-400'}>
                    ② Vị trí {hasLocation && '✓'}
                  </span>
                  <span className="h-0.5 w-6 bg-gray-200" />
                  <span className={hasCategory ? 'text-primary font-bold' : 'text-gray-400'}>
                    ③ Loại {hasCategory && '✓'}
                  </span>
                </div>

                {/* B1 AI gợi ý: Băng nằm đầu cột form phải (dưới thanh bước ①②③) */}
                {renderAiBanner()}

                {/* 2. Loại sự cố 2x2 */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Loại phản ánh <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
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
                          <span className="text-xs font-bold text-gray-900">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Vị trí */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Vị trí <span className="text-red-500">*</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/bao-su-co/vi-tri')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {hasLocation ? 'Đổi vị trí' : 'Chọn vị trí'}
                    </button>
                  </div>

                  {hasLocation ? (
                    <div className="flex items-center gap-2.5 rounded-card border border-[#E5E7EB] bg-gray-50 p-3 shadow-soft">
                      <MapPin className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-800">{address}</p>
                        <p className="text-[11px] text-gray-400">
                          {isGpsAuto ? 'Vị trí hiện tại qua GPS' : 'Vị trí đã chọn trên bản đồ'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-card border-2 border-dashed border-amber-300 bg-amber-50/70 p-3 text-center">
                      <span className="text-xs font-bold text-amber-800">Chưa xác định vị trí</span>
                      <button
                        type="button"
                        onClick={() => navigate('/bao-su-co/vi-tri')}
                        className="ml-3 inline-flex items-center gap-1 text-xs font-bold text-primary underline"
                      >
                        Chọn trên bản đồ →
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Mô tả & SĐT */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mô tả chi tiết (tuỳ chọn)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ghi chú chi tiết về sự cố (vd: trước số nhà 12, sụt lún sâu...)"
                      rows={2}
                      className="w-full rounded-card border border-[#E5E7EB] bg-gray-50 p-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Số điện thoại nhận tin (để trống nếu gửi ẩn danh)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Nhập số điện thoại của bạn..."
                      className="w-full rounded-card border border-[#E5E7EB] bg-gray-50 p-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* B2 Cảnh báo trùng: Thẻ cam nằm cuối cột form phải, ngay trên nút Gửi; ảnh nhỏ 64px bên trái */}
              {topDup && (
                <div className="flex items-start gap-3 rounded-card border border-amber-300 bg-amber-50 p-3 shadow-soft">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-amber-200 bg-amber-100">
                    <img
                      src={topDup.report.photos[0] || '/demo-photos/placeholder.jpg'}
                      alt="Sự cố tương tự"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="%23fef3c7" width="64" height="64"/><text fill="%23b45309" font-size="10" dy="3.5" x="50%" y="50%" text-anchor="middle">Trùng</text></svg>';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 font-bold text-xs text-amber-950">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Có sự cố tương tự cách {Math.round(topDup.distanceMeters)}m</span>
                      </div>
                      <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] text-amber-900 font-semibold shrink-0">
                        Gợi ý mô phỏng
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 line-clamp-2 mt-0.5 leading-snug">
                      Hồ sơ #{topDup.report.id} ({topDup.report.address}) đang được xử lý.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/phan-anh/${topDup.report.id}`)}
                      className="text-[11px] font-semibold text-primary hover:underline mt-1 inline-block"
                    >
                      Xem hồ sơ #{topDup.report.id} →
                    </button>
                  </div>
                </div>
              )}

              {/* Nút gửi Desktop */}
              <div className="pt-4">
                <ActionError
                  message={submitAction.error}
                  onDismiss={submitAction.clearError}
                  className="mb-2"
                />
                <button
                  type="button"
                  disabled={!category || !hasLocation || submitAction.pending}
                  onClick={handleStartSubmit}
                  className={`w-full rounded-btn py-3 text-xs font-bold text-white shadow-soft transition-all ${
                    category && hasLocation
                      ? 'bg-primary hover:bg-primary-hover active:scale-[0.99]'
                      : 'bg-gray-300 cursor-not-allowed text-gray-500'
                  }`}
                >
                  {submitAction.pending ? 'Đang gửi...' : 'Gửi phản ánh ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={addPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAddPhoto}
      />

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
