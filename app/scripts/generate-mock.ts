import fs from 'node:fs';
import path from 'node:path';
import { generateMockData, DEFAULT_SEED } from '../src/domain/generator';

const mockPath = path.resolve(process.cwd(), 'src/data/mock.json');
const mockDir = path.dirname(mockPath);

if (!fs.existsSync(mockDir)) {
  fs.mkdirSync(mockDir, { recursive: true });
}

console.log(`Đang sinh dữ liệu mẫu với seed ${DEFAULT_SEED}...`);
const data = generateMockData(DEFAULT_SEED);

fs.writeFileSync(mockPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(
  `Đã tạo thành công ${data.reports.length} phản ánh và ${data.volunteerTasks.length} nhiệm vụ TNV tại ${mockPath}`
);
