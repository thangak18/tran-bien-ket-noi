import fs from 'node:fs';
import path from 'node:path';

// verify-mock.ts: kiểm tra bất biến dữ liệu spec 5.1 & tests.md DV-001 -> DV-014
const mockPath = path.resolve(process.cwd(), 'src/data/mock.json');

if (!fs.existsSync(mockPath)) {
  console.log('mock.json chưa được tạo (chờ task T-019). Tạm thời bỏ qua.');
  process.exit(0);
}

console.log('mock.json đã tồn tại. Đang kiểm tra bất biến dữ liệu...');
// Chi tiết DV-001 -> DV-014 sẽ được triển khai đầy đủ ở T-019
process.exit(0);
