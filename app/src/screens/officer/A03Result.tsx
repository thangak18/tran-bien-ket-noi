import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Camera, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { completeReport } from '@/store/officerActions';
import { Button } from '@/components/ui/Button';

export function A03Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const report = state.reports.find((r) => r.id === id);

  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [resultNote, setResultNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Không tìm thấy hồ sơ</h1>
        <Button className="mt-4" onClick={() => navigate('/can-bo')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) setAfterPhoto(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseSampleAfterPhoto = () => {
    setAfterPhoto(`/demo-photos/after/${report.category}.jpg`);
  };

  const handleComplete = () => {
    if (!afterPhoto) {
      setErrorMsg('Vui lòng chọn hoặc chụp ảnh kết quả hiện trường.');
      return;
    }
    if (resultNote.trim().length < 10) {
      setErrorMsg('Mô tả kết quả công việc phải có ít nhất 10 ký tự.');
      return;
    }

    try {
      const newState = completeReport(
        state,
        report.id,
        {
          resultPhotos: [afterPhoto],
          resultNote: resultNote.trim(),
        },
        state.settings.demoNow
      );
      dispatch({ type: 'HYDRATE', payload: newState });
      navigate(`/can-bo/${report.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate(`/can-bo/${report.id}`)}
          aria-label="Quay lại"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold text-gray-900" data-testid="screen-title">
            Cập nhật kết quả hoàn thành
          </h1>
          <span className="font-mono text-xs text-gray-500" data-testid="report-id">
            {report.id}
          </span>
        </div>

        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Đối chiếu ảnh trước */}
        <div className="rounded-3xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500 mb-2">Ảnh hiện trường ban đầu</p>
          <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-100">
            <img
              src={report.photos[0] || '/demo-photos/mat_duong/1.jpg'}
              alt="Ảnh trước"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150"><rect fill="%23f3f4f6" width="400" height="150"/><text fill="%239ca3af" font-size="12" dy="4" x="50%" y="50%" text-anchor="middle">Ảnh ban đầu</text></svg>';
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-700 font-medium truncate">{report.address}</p>
        </div>

        {/* Khung tải ảnh kết quả sau xử lý */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">
            Ảnh kết quả sau xử lý <span className="text-red-500">*</span>
          </h3>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!afterPhoto ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center cursor-pointer hover:border-primary hover:bg-primary-50/20 transition-all"
            >
              <Camera className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-xs font-semibold text-gray-700">
                Chạm để chọn hoặc chụp ảnh sau xử lý
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              <img
                src={afterPhoto}
                alt="Ảnh sau xử lý"
                className="h-48 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect fill="%23dcfce7" width="400" height="200"/><text fill="%23166534" font-size="14" dy="5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh kết quả sau xử lý</text></svg>';
                }}
              />
              <button
                type="button"
                onClick={() => setAfterPhoto('')}
                className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black/80"
              >
                Đổi ảnh khác
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
              Tải ảnh lên
            </button>
            <button
              type="button"
              onClick={handleUseSampleAfterPhoto}
              className="flex-1 rounded-xl border border-primary-200 bg-primary-50 py-2 text-xs font-semibold text-primary hover:bg-primary-100"
            >
              ⚡ Dùng ảnh mẫu
            </button>
          </div>
        </div>

        {/* Khung nhập mô tả kết quả */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-2">
          <label htmlFor="result-note" className="block text-sm font-bold text-gray-900">
            Nội dung công việc đã thực hiện <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500">
            Mô tả rõ công việc khắc phục (tối thiểu 10 ký tự).
          </p>
          <textarea
            id="result-note"
            rows={3}
            value={resultNote}
            onChange={(e) => {
              setResultNote(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="Ví dụ: Đã thay bóng đèn LED mới, dọn dẹp mặt bằng sạch sẽ và kiểm tra sáng bình thường..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Nút hoàn thành */}
        <div className="pt-2">
          <Button
            fullWidth
            size="lg"
            disabled={!afterPhoto || resultNote.trim().length < 10}
            onClick={handleComplete}
            className="flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>Xác nhận hoàn thành</span>
          </Button>
        </div>
      </main>
    </div>
  );
}
