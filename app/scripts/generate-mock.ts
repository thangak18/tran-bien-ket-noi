import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import { generateMockData, DEFAULT_SEED } from '../src/domain/generator';

const mockPath = path.resolve(process.cwd(), 'src/data/mock.json');
const mockDir = path.dirname(mockPath);

if (!fs.existsSync(mockDir)) {
  fs.mkdirSync(mockDir, { recursive: true });
}

console.log(`Đang sinh dữ liệu mẫu với seed ${DEFAULT_SEED}...`);
const data = generateMockData(DEFAULT_SEED);

const formatted = await prettier.format(JSON.stringify(data), { parser: 'json' });
fs.writeFileSync(mockPath, formatted, 'utf-8');
console.log(
  `Đã tạo thành công ${data.reports.length} phản ánh và ${data.volunteerTasks.length} nhiệm vụ TNV tại ${mockPath}`
);
