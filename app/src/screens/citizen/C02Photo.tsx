import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { StepHeader } from '@/components/common/StepHeader';
import { Button } from '@/components/ui/Button';

export function C02Photo() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const [photo, setPhoto] = useState<string>(state.draft?.photos?.[0] || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPhoto(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseSamplePhoto = () => {
    // Ảnh mẫu mặt đường hư hỏng để thao tác nhanh
    setPhoto('/demo-photos/mat_duong/1.jpg');
  };

  const handleContinue = () => {
    if (!photo) return;
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        photos: [photo],
      },
    });
    navigate('/bao-su-co/vi-tri');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-8">
      <StepHeader currentStep={1} title="Chụp ảnh" onCancel={() => navigate('/')} />

      <main className="flex-1 px-4 py-4 flex flex-col justify-between max-w-md mx-auto w-full">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {!photo ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary-light/60 bg-white p-6 text-center cursor-pointer hover:border-primary hover:bg-primary-50/20 transition-all shadow-2xs"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary">
                <Camera className="h-10 w-10" />
              </div>
              <p className="text-base font-semibold text-gray-900">Chạm để chụp ảnh</p>
              <p className="mt-1 text-xs text-gray-500 max-w-[240px]">
                Camera sẽ mở ngay để bạn chụp chỗ bị hư hỏng
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <img
                src={photo}
                alt="Hiện trường sự cố"
                className="h-80 w-full object-cover"
                onError={(e) => {
                  // Fallback nếu ảnh không tải được
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f3f4f6" width="400" height="300"/><text fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh hiện trường mẫu</text></svg>';
                }}
              />
              <button
                type="button"
                onClick={() => setPhoto('')}
                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xs hover:bg-black/75"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Chụp lại
              </button>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 p-3 text-xs text-amber-800">
            <span className="font-semibold">Mẹo:</span> Lùi xa một chút để thấy cả xung quanh chỗ bị
            hư giúp cán bộ dễ nhận diện vị trí.
          </div>

          {!photo && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ImageIcon className="h-4 w-4 text-gray-500" />
                Chọn ảnh từ thư viện máy
              </button>
              <button
                type="button"
                onClick={handleUseSamplePhoto}
                className="text-xs text-primary font-medium py-1.5 hover:underline text-center"
              >
                ⚡ Dùng nhanh ảnh mẫu để thử nghiệm
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button fullWidth size="lg" disabled={!photo} onClick={handleContinue}>
            Tiếp tục
          </Button>
        </div>
      </main>
    </div>
  );
}
