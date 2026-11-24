import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Phone, Mail, Lock, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';

export function LoginScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectUrl = searchParams.get('redirect') || '';

  const [activeTab, setActiveTab] = useState<'staff' | 'citizen'>('staff');

  // Staff login state
  const [email, setEmail] = useState('cb.minh@tranbien.gov.vn');
  const [password, setPassword] = useState('TranBien@2026!');
  const [staffRole, setStaffRole] = useState<'can_bo' | 'tnv'>('can_bo');

  // Citizen login state
  const [phone, setPhone] = useState('0909000068');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStaffLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    // Mock/Demo authentication for Staff
    setTimeout(() => {
      const isOfficer = staffRole === 'can_bo';
      const token = isOfficer ? 'mock_can_bo' : 'mock_tnv';
      const name = isOfficer ? 'Nguyễn Văn Minh (Cán bộ)' : 'Trần Thị Mai (TNV)';

      localStorage.setItem('tbkn_auth_token', token);
      localStorage.setItem('tbkn_user_role', staffRole);
      localStorage.setItem('tbkn_user_name', name);

      setLoading(false);
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate(isOfficer ? '/can-bo' : '/tnv');
      }
    }, 400);
  };

  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!/^0[0-9]{9}$/.test(phone)) {
      setError('Số điện thoại phải gồm 10 chữ số, bắt đầu bằng số 0');
      return;
    }
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setOtpSent(true);
      setOtp('123456'); // Gợi ý sẵn OTP mô phỏng
      setLoading(false);
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456') {
      setError('Mã OTP không chính xác. Mã mô phỏng là: 123456');
      return;
    }
    setLoading(true);
    setError(null);
    setTimeout(() => {
      localStorage.setItem('tbkn_auth_token', 'citizen_mock_jwt');
      localStorage.setItem('tbkn_user_role', 'citizen');
      localStorage.setItem('tbkn_user_phone', phone);
      setLoading(false);
      navigate(redirectUrl || '/cua-toi');
    }, 400);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FB] px-4 py-8">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trấn Biên Kết Nối</h1>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-500">Hệ thống Tiếp nhận & Xử lý Phản ánh</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Mô phỏng
          </span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Tab Selection */}
        <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Cán bộ / TNV
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
              activeTab === 'citizen'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Phone className="h-4 w-4" />
            Người dân (OTP)
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Form Cán bộ / TNV */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Vai trò</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStaffRole('can_bo');
                    setEmail('cb.minh@tranbien.gov.vn');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                    staffRole === 'can_bo'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Cán bộ phường
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffRole('tnv');
                    setEmail('tnv.mai@tranbien.gov.vn');
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                    staffRole === 'tnv'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Tình nguyện viên
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Email công vụ</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="cb.minh@tranbien.gov.vn"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Mật khẩu mẫu demo: <code className="font-semibold text-gray-700">TranBien@2026!</code></p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Nút đăng nhập nhanh 1-click cho ban giám khảo */}
            <div className="pt-2">
              <div className="relative flex items-center justify-center py-2">
                <div className="w-full border-t border-gray-200" />
                <span className="absolute bg-white px-2 text-[11px] font-medium text-gray-400">
                  Dành cho Ban Giám Khảo (Demo)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStaffRole('can_bo');
                    handleStaffLogin();
                  }}
                  className="rounded-xl border border-blue-200 bg-blue-50/70 p-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  ⚡ Vào nhanh Cán bộ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffRole('tnv');
                    handleStaffLogin();
                  }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  ⚡ Vào nhanh TNV
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Form Người dân */}
        {activeTab === 'citizen' && (
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                  required
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100"
                  placeholder="0909000068"
                />
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Mã xác thực OTP (6 chữ số)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 py-2.5 text-center text-lg font-bold tracking-widest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="123456"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mã mô phỏng: 123456
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-primary hover:underline"
                  >
                    Đổi số khác
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
            >
              {loading
                ? 'Đang xử lý...'
                : otpSent
                ? 'Xác nhận và Đăng nhập'
                : 'Nhận mã OTP (Mô phỏng 123456)'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      {/* Back to Home */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 text-xs font-semibold text-gray-500 hover:text-gray-900"
      >
        ← Quay lại trang chủ Trấn Biên Kết Nối
      </button>
    </div>
  );
}
