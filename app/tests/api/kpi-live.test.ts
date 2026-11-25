// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { app } from '../../server/app';
import { createStaffToken } from '../../server/middleware/auth';
import { sqlClient } from '../../server/db/client';
import { purgeTestReports } from './helpers';

const createdIds: string[] = [];
describe('L5: Live KPI Calculation over Real Data (without hardcoded is_seed filter)', () => {
  afterAll(async () => {
    await purgeTestReports(createdIds);
  });
  it('KPI-001: Returns live totals and dynamically increases when a new report is added', async () => {
    // 1. Initial check
    const initialRes = await app.request('/public/kpi');
    expect(initialRes.status).toBe(200);
    const initialData = await initialRes.json();
    const initialTotal = initialData.total;
    expect(initialTotal).toBeGreaterThanOrEqual(64);

    // 2. Insert 1 new report with unique code
    const uniqueNum = Date.now().toString().slice(-6);
    const newReportId = `88888888-8888-8888-8888-${uniqueNum.padStart(12, '0')}`;
    const newReportCode = `TB-KPI-${uniqueNum}`;
    createdIds.push(newReportId);
    await sqlClient`
      INSERT INTO reports (
        id, code, category, status, priority, location, address,
        secret_code_hash, version, is_seed, created_at
      ) VALUES (
        ${newReportId}::uuid, ${newReportCode}, 'den_duong', 'moi', 'binh_thuong',
        ST_GeographyFromText('POINT(106.8225 10.9505)'), 'Đường Mới Tạo 65',
        'hash123', 1, false, now()
      );
    `;

    // 3. Public KPI should now return initialTotal + 1
    const publicRes = await app.request('/public/kpi');
    expect(publicRes.status).toBe(200);
    const publicData = await publicRes.json();
    expect(publicData.total).toBe(initialTotal + 1);

    // 4. Officer KPI should also return initialTotal + 1
    const officerToken = await createStaffToken('11111111-1111-1111-1111-111111111111', 'can_bo');
    const officerRes = await app.request('/officer/kpi', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(officerRes.status).toBe(200);
    const officerData = await officerRes.json();
    expect(officerData.total).toBe(initialTotal + 1);
  });
});
