import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image as ImageIcon, ZapOff } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';

export function C02Photo() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const [photo, setPhoto] = useState<string>(state.draft?.photos?.[0] || '');

  // Trên desktop (>= 1024px): chuyển thẳng sang màn xác nhận gửi 2 cột
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      navigate('/bao-su-co/xac-nhan', { replace: true });
    }
  }, [navigate]);

  const fileCameraInputRef = useRef<HTMLInputElement>(null);
  const fileGalleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPhoto(result);
          dispatch({
            type: 'SET_DRAFT',
            payload: { photos: [result] },
          });
          navigate('/bao-su-co/xac-nhan');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseSample = () => {
    const sample = '/demo-photos/mat_duong/1.jpg';
    setPhoto(sample);
    dispatch({
      type: 'SET_DRAFT',
      payload: { photos: [sample] },
    });
    navigate('/bao-su-co/xac-nhan');
  };

  return (
    <div className="relative flex h-screen w-full flex-col justify-between bg-[#111111] text-white select-none overflow-hidden">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Bước 1: Chụp ảnh
      </h1>

      {/* Background ảnh nếu đã có */}
      {photo && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${photo})` }}
        />
      )}

      {/* Header: ← "Chụp phản ánh" + "0/5 ảnh" */}
      <header className="relative z-10 flex h-14 items-center justify-between px-4 pt-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h2 className="text-sm font-semibold tracking-wide">Chụp phản ánh</h2>

        <span className="text-xs font-medium text-gray-400">{photo ? '1' : '0'}/5 ảnh</span>
      </header>

      {/* Giữa màn hình: Khung ngắm 4 góc trắng */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative flex h-64 w-64 items-center justify-center">
          {/* Góc trên trái */}
          <div className="absolute top-0 left-0 h-6 w-6 border-t-3 border-l-3 border-white rounded-tl-[4px]" />
          {/* Góc trên phải */}
          <div className="absolute top-0 right-0 h-6 w-6 border-t-3 border-r-3 border-white rounded-tr-[4px]" />
          {/* Góc dưới trái */}
          <div className="absolute bottom-0 left-0 h-6 w-6 border-b-3 border-l-3 border-white rounded-bl-[4px]" />
          {/* Góc dưới phải */}
          <div className="absolute bottom-0 right-0 h-6 w-6 border-b-3 border-r-3 border-white rounded-br-[4px]" />

          {/* Dấu tâm ngắm nhỏ */}
          <div className="h-2 w-2 rounded-full bg-white/40" />
        </div>

        <p className="mt-4 text-xs font-medium text-gray-300">Đưa sự cố vào khung hình để chụp</p>

        {/* Nút dùng ảnh mẫu thử nghiệm nhanh */}
        <button
          type="button"
          onClick={handleUseSample}
          className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-blue-300 backdrop-blur-xs hover:bg-white/20"
        >
          ⚡ Dùng ảnh mẫu nhanh
        </button>
      </main>

      {/* Thanh đáy bo tròn tối */}
      <footer className="relative z-10 flex items-center justify-around rounded-t-[28px] bg-black/80 px-8 py-6 backdrop-blur-lg">
        {/* Nút đèn pin (trang trí, disabled) */}
        <button
          type="button"
          disabled
          aria-label="Bật đèn flash"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-gray-500 cursor-not-allowed"
        >
          <ZapOff className="h-5 w-5" />
        </button>

        {/* Nút chụp tròn lớn primary (56-64px) */}
        <button
          type="button"
          aria-label="Chụp ảnh sự cố"
          onClick={() => fileCameraInputRef.current?.click()}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-90 ring-4 ring-white/20"
        >
          <Camera className="h-7 w-7" />
        </button>

        {/* Nút thư viện ảnh */}
        <button
          type="button"
          aria-label="Chọn ảnh từ thư viện"
          onClick={() => fileGalleryInputRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ImageIcon className="h-5 w-5" />
        </button>

        {/* Hidden inputs */}
        <input
          ref={fileCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileGalleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </footer>
    </div>
  );
}
