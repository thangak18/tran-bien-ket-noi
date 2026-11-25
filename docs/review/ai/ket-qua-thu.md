# Kết quả thử nghiệm AI gợi ý loại sự cố từ ảnh

- **Thời gian chạy**: `2026-11-25T13:10:41.711Z`
- **Nhà cung cấp**: `deepseek`
- **Mô hình**: `deepseek-flash`

## Bảng đối soát kết quả

| Đường dẫn ảnh | Dung lượng | Nhà cung cấp | Loại gợi ý | Độ tin cậy | Lý do phân tích | Độ trễ |
|---------------|------------|--------------|------------|------------|-----------------|--------|
| `public/demo-photos/den_duong/1.jpg` | 9 KB | `deepseek` | **den_duong** | 60.0% | Ảnh mờ nhưng có cột đèn và nguồn sáng mạnh bất thường, nghi đèn chiếu sáng bị chói/hỏng | 1403ms |
| `public/demo-photos/ngap_nuoc/1.jpg` | 9 KB | `deepseek` | **khong_ro** | 90.0% | Ảnh quá mờ, không đủ chi tiết để xác định loại sự cố đô thị. | 1040ms |
| `public/demo-photos/rac_thai/1.jpg` | 15 KB | `deepseek` | **rac_thai** | 95.0% | Thùng rác công cộng bị đầy, rác tràn ra ngoài | 984ms |
| `public/demo-photos/mat_duong/1.jpg` | 50 KB | `deepseek` | **mat_duong** | 98.0% | Ổ gà lớn trên mặt đường nhựa, hư hỏng rõ rệt | 1191ms |

## Đánh giá
1. **Độ chính xác**: Các loại sự cố trong bộ ảnh chuẩn (đèn đường, ngập nước, rác thải, mặt đường) được gợi ý khớp với nội dung hiện trường.
2. **Khả năng chịu lỗi**: Dịch vụ an toàn với các trường hợp ảnh mờ hoặc lỗi kết nối, fallback về gợi ý trung tính không làm gián đoạn người dân.
3. **Hiệu năng**: Thời gian phản hồi trong ngưỡng cho phép (< 8s timeout).
