import { useNavigate } from 'react-router-dom';
import { Home, Shield, Users, BarChart3, Palette, ExternalLink, Settings } from 'lucide-react';

export function DemoHub() {
  const navigate = useNavigate();

  const links = [
    {
      title: 'Cổng công dân (Trang chủ)',
      desc: 'Trang chủ phản ánh hiện trường, theo dõi tiến độ và báo cáo nhanh',
      path: '/',
      icon: <Home className="h-5 w-5 text-primary" />,
    },
    {
      title: 'Quy trình báo sự cố',
      desc: 'Chụp ảnh → Lấy vị trí → Chọn loại → OTP và nhận mã',
      path: '/bao-su-co/anh',
      icon: <ExternalLink className="h-5 w-5 text-emerald-600" />,
    },
    {
      title: 'Hộp tiếp nhận của cán bộ',
      desc: 'Danh sách hồ sơ theo độ ưu tiên: quá hạn, sắp hạn, mới gửi',
      path: '/can-bo',
      icon: <Shield className="h-5 w-5 text-blue-600" />,
    },
    {
      title: 'Bảng minh bạch phường',
      desc: '4 chỉ số KPI thực tế, phân bổ 4 loại sự cố và ảnh Trước/Sau',
      path: '/minh-bach',
      icon: <BarChart3 className="h-5 w-5 text-purple-600" />,
    },
    {
      title: 'Bản đồ quanh đây',
      desc: 'Bản đồ vị trí sự cố trên địa bàn Phường Trấn Biên',
      path: '/quanh-day',
      icon: <ExternalLink className="h-5 w-5 text-amber-600" />,
    },
    {
      title: 'Cổng tình nguyện viên',
      desc: 'Xác minh hiện trường và hỗ trợ nghiệm thu cộng đồng',
      path: '/tnv',
      icon: <Users className="h-5 w-5 text-teal-600" />,
    },
    {
      title: 'Cổng quản trị',
      desc: 'Quản lý tài khoản, bộ phận, cấu hình và nhật ký',
      path: '/quan-tri',
      icon: <Settings className="h-5 w-5 text-primary" />,
    },
    {
      title: 'Thư viện UI / Component Gallery',
      desc: 'Xem toàn bộ 14 component chuẩn thiết kế cho mobile',
      path: '/dev/ui',
      icon: <Palette className="h-5 w-5 text-pink-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-2xs">
        <div className="mx-auto max-w-md">
          <h1 className="text-lg font-bold text-gray-900" data-testid="screen-title">
            Trấn Biên Kết Nối – Demo Hub
          </h1>
          <p className="text-xs text-gray-500">
            Hệ thống phản ánh hiện trường đô thị · Hackathon 2026
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-3">
        {links.map((l) => (
          <div
            key={l.path}
            onClick={() => navigate(l.path)}
            className="flex cursor-pointer items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:border-primary-300 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                {l.icon}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{l.title}</h2>
                <p className="text-xs text-gray-500 line-clamp-1">{l.desc}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        ))}
      </main>
    </div>
  );
}
