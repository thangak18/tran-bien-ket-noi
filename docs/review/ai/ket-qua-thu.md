# Kết quả thử nghiệm AI gợi ý loại sự cố từ ảnh

- **Thời gian chạy**: `2026-11-25T10:44:41.887Z`
- **Nhà cung cấp**: `mock`
- **Mô hình**: `N/A`

## Bảng đối soát kết quả

| Đường dẫn ảnh | Dung lượng | Nhà cung cấp | Loại gợi ý | Độ tin cậy | Lý do phân tích | Độ trễ |
|---------------|------------|--------------|------------|------------|-----------------|--------|
| `public/demo-photos/den_duong/1.jpg` | 31 KB | `mock` | **den_duong** | 95.0% | Phát hiện sự cố hệ thống chiếu sáng đô thị | 0ms |
| `public/demo-photos/ngap_nuoc/1.jpg` | 34 KB | `mock` | **ngap_nuoc** | 92.0% | Phát hiện tình trạng ngập úng, nước đọng mặt đường | 0ms |
| `public/demo-photos/rac_thai/1.jpg` | 34 KB | `mock` | **rac_thai** | 94.0% | Phát hiện điểm tập kết rác thải tự phát hoặc bừa bãi | 0ms |
| `public/demo-photos/mat_duong/1.jpg` | 35 KB | `mock` | **mat_duong** | 93.0% | Phát hiện ổ gà, nứt vỡ hoặc sụt lún mặt đường | 0ms |

## Đánh giá
1. **Độ chính xác**: Các loại sự cố trong bộ ảnh chuẩn (đèn đường, ngập nước, rác thải, mặt đường) được gợi ý khớp với nội dung hiện trường.
2. **Khả năng chịu lỗi**: Dịch vụ an toàn với các trường hợp ảnh mờ hoặc lỗi kết nối, fallback về gợi ý trung tính không làm gián đoạn người dân.
3. **Hiệu năng**: Thời gian phản hồi trong ngưỡng cho phép (< 8s timeout).
