// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { sqlClient } from '../../server/db/client';
import { findDuplicates } from '../../src/domain/duplicates';
import type { Report } from '../../src/domain/types';
import mock from '../../src/data/mock.json';

const DEMO_NOW = '2026-11-24T09:00:00+07:00';
const BASE = { lng: 106.8225, lat: 10.9505 };

class Rollback extends Error {}

/** Chạy fn trong transaction rồi luôn rollback để không để lại dữ liệu thử. */
async function inRollback(fn: (sql: typeof sqlClient) => Promise<void>): Promise<void> {
  try {
    await sqlClient.begin(async (tx) => {
      await fn(tx as unknown as typeof sqlClient);
      throw new Rollback('rollback');
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
}

/** Điểm cách BASE `meters` mét về phía bắc, tính bằng ST_Project (trắc địa thật của PostGIS). */
async function pointNorth(
  sql: typeof sqlClient,
  meters: number
): Promise<{ lng: number; lat: number }> {
  const [row] = await sql`
    SELECT ST_X(p::geometry) AS lng, ST_Y(p::geometry) AS lat
    FROM (SELECT ST_Project(ST_SetSRID(ST_MakePoint(${BASE.lng}, ${BASE.lat}), 4326)::geography, ${meters}, 0) AS p) t;
  `;
  return { lng: Number(row?.lng), lat: Number(row?.lat) };
}

async function insertReport(
  sql: typeof sqlClient,
  code: string,
  category: string,
  createdAt: string,
  status = 'moi'
): Promise<string> {
  const [row] = await sql`
    INSERT INTO reports (code, category, status, location, address, secret_code_hash, created_at, completed_at, is_seed)
    VALUES (
      ${code}, ${category}::category, ${status}::report_status,
      ST_SetSRID(ST_MakePoint(${BASE.lng}, ${BASE.lat}), 4326)::geography,
      'Địa chỉ thử nghiệm', ${'h'.repeat(32)}, ${createdAt}::timestamptz,
      CASE WHEN ${status} IN ('dong', 'hoan_thanh') THEN ${createdAt}::timestamptz + interval '1 day' END, false
    )
    RETURNING id;
  `;
  return String(row?.id);
}

async function dbDuplicates(
  sql: typeof sqlClient,
  point: { lng: number; lat: number },
  category: string
): Promise<string[]> {
  const rows = await sql`
    SELECT code FROM find_duplicate_reports(
      ${point.lng}, ${point.lat}, ${category}::category, ${DEMO_NOW}::timestamptz
    );
  `;
  return rows.map((r) => String(r.code));
}

describe('PostGIS thật: tìm trùng bằng ST_DWithin (Spec 3.5)', () => {
  it('PG-001: PostGIS chạy thật và cột location là geography(Point,4326)', async () => {
    const [v] = await sqlClient`SELECT postgis_version() AS v;`;
    expect(String(v?.v)).toMatch(/^3\./);
    const [col] = await sqlClient`
      SELECT type, srid FROM geography_columns
      WHERE f_table_name = 'reports' AND f_geography_column = 'location';
    `;
    expect(col?.type).toBe('Point');
    expect(Number(col?.srid)).toBe(4326);
  });

  it('PG-002: hai điểm cách 30 m thì trùng', async () => {
    await inRollback(async (sql) => {
      await insertReport(sql, 'TB-T-0030', 'rac_thai', '2026-11-20T08:00:00+07:00');
      const near = await pointNorth(sql, 30);
      expect(await dbDuplicates(sql, near, 'rac_thai')).toContain('TB-T-0030');
    });
  });

  it('PG-003: hai điểm cách 80 m thì không trùng', async () => {
    await inRollback(async (sql) => {
      await insertReport(sql, 'TB-T-0080', 'rac_thai', '2026-11-20T08:00:00+07:00');
      const far = await pointNorth(sql, 80);
      expect(await dbDuplicates(sql, far, 'rac_thai')).not.toContain('TB-T-0080');
    });
  });

  it('PG-004: khác loại, quá 14 ngày hoặc đã đóng thì không trùng dù cách 30 m', async () => {
    await inRollback(async (sql) => {
      await insertReport(sql, 'TB-T-KLOAI', 'den_duong', '2026-11-20T08:00:00+07:00');
      await insertReport(sql, 'TB-T-CU', 'rac_thai', '2026-11-05T08:00:00+07:00');
      await insertReport(sql, 'TB-T-DONG', 'rac_thai', '2026-11-20T08:00:00+07:00', 'dong');
      const near = await pointNorth(sql, 30);
      const found = await dbDuplicates(sql, near, 'rac_thai');
      expect(found).not.toContain('TB-T-KLOAI');
      expect(found).not.toContain('TB-T-CU');
      expect(found).not.toContain('TB-T-DONG');
    });
  });

  it('PG-005: kết quả của PostGIS khớp domain/duplicates.ts trên toàn bộ 64 hồ sơ mẫu', async () => {
    const reports = mock.reports as unknown as Report[];
    let compared = 0;
    for (const candidate of reports) {
      const expected = findDuplicates(
        { id: candidate.id, category: candidate.category, lat: candidate.lat, lng: candidate.lng },
        reports,
        DEMO_NOW
      )
        .map((m) => m.report.id)
        .sort();
      const rows = await sqlClient`
        SELECT code FROM find_duplicate_reports(
          ${candidate.lng}, ${candidate.lat}, ${candidate.category}::category,
          ${DEMO_NOW}::timestamptz, (SELECT id FROM reports WHERE code = ${candidate.id})
        );
      `;
      const actual = rows.map((r) => String(r.code)).sort();
      expect(actual, `Hồ sơ ${candidate.id}`).toEqual(expected);
      compared++;
    }
    expect(compared).toBe(64);
  });
});
