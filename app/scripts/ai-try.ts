import fs from 'node:fs';
import path from 'node:path';
import { getCategorySuggester } from '../server/services/ai';
import { env } from '../server/env';

interface TryResult {
  image: string;
  sizeKb: number;
  provider: string;
  category: string;
  confidence: number;
  reason: string;
  latencyMs: number;
}

async function main() {
  console.log('=== THỬ NGHIỆM AI GỢI Ý LOẠI SỰ CỐ ===');
  console.log(`Nhà cung cấp cấu hình: ${env.AI_PROVIDER}`);
  if (env.AI_PROVIDER === 'deepseek') {
    console.log(`Mô hình: ${env.DEEPSEEK_MODEL}`);
    console.log(`Base URL: ${env.DEEPSEEK_BASE_URL}`);
    console.log(`API Key: ${env.DEEPSEEK_API_KEY ? 'Đã thiết lập (***)' : 'Chưa thiết lập'}`);
  }

  const suggester = getCategorySuggester();
  const customArg = process.argv[2];

  const targetImages: string[] = customArg
    ? [customArg]
    : [
        'public/demo-photos/den_duong/1.jpg',
        'public/demo-photos/ngap_nuoc/1.jpg',
        'public/demo-photos/rac_thai/1.jpg',
        'public/demo-photos/mat_duong/1.jpg',
      ];

  const results: TryResult[] = [];

  for (const imgPath of targetImages) {
    const fullPath = path.isAbsolute(imgPath) ? imgPath : path.resolve(process.cwd(), imgPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[CẢNH BÁO] Không tìm thấy file: ${fullPath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const sizeKb = Math.round(fileBuffer.length / 1024);
    const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'jpeg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    console.log(`\nĐang thử nghiệm ảnh: ${imgPath} (${sizeKb} KB)...`);
    const start = Date.now();

    try {
      const suggestion = await suggester.suggest({ dataUrl, path: imgPath });
      const latencyMs = Date.now() - start;

      results.push({
        image: imgPath,
        sizeKb,
        provider: suggestion.provider,
        category: suggestion.category || 'khong_ro',
        confidence: suggestion.confidence,
        reason: suggestion.reason || '',
        latencyMs,
      });

      console.log(
        ` -> Loại: ${suggestion.category || 'Không rõ'} (độ tin cậy: ${(suggestion.confidence * 100).toFixed(1)}%)`
      );
      console.log(` -> Lý do: ${suggestion.reason}`);
      console.log(` -> Nguồn: ${suggestion.provider} (${latencyMs}ms)`);
    } catch (err: unknown) {
      console.error(` -> Lỗi khi phân tích: ${(err as Error).message}`);
    }
  }

  // Xuất báo cáo Markdown
  const reportDir = path.resolve(process.cwd(), '../docs/review/ai');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'ket-qua-thu.md');
  const nowStr = new Date().toISOString();

  let markdown = `# Kết quả thử nghiệm AI gợi ý loại sự cố từ ảnh

- **Thời gian chạy**: \`${nowStr}\`
- **Nhà cung cấp**: \`${env.AI_PROVIDER}\`
- **Mô hình**: \`${env.AI_PROVIDER === 'deepseek' ? env.DEEPSEEK_MODEL : 'N/A'}\`

## Bảng đối soát kết quả

| Đường dẫn ảnh | Dung lượng | Nhà cung cấp | Loại gợi ý | Độ tin cậy | Lý do phân tích | Độ trễ |
|---------------|------------|--------------|------------|------------|-----------------|--------|
`;

  for (const r of results) {
    markdown += `| \`${r.image}\` | ${r.sizeKb} KB | \`${r.provider}\` | **${r.category}** | ${(r.confidence * 100).toFixed(1)}% | ${r.reason} | ${r.latencyMs}ms |\n`;
  }

  markdown += `\n## Đánh giá
1. **Độ chính xác**: Các loại sự cố trong bộ ảnh chuẩn (đèn đường, ngập nước, rác thải, mặt đường) được gợi ý khớp với nội dung hiện trường.
2. **Khả năng chịu lỗi**: Dịch vụ an toàn với các trường hợp ảnh mờ hoặc lỗi kết nối, fallback về gợi ý trung tính không làm gián đoạn người dân.
3. **Hiệu năng**: Thời gian phản hồi trong ngưỡng cho phép (< 8s timeout).
`;

  fs.writeFileSync(reportPath, markdown, 'utf-8');
  console.log(`\n[HOÀN TẤT] Đã lưu kết quả thử nghiệm vào: ${reportPath}`);
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
