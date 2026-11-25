import { Env, IncidentCategory } from './types';

export interface StoredReportRow {
  id: string;
  category: IncidentCategory;
  title: string | null;
  description: string | null;
  photos_json: string;
  result_photos_json: string;
  lat: number;
  lng: number;
  address: string;
  location_note: string | null;
  status: string;
  department: string | null;
  created_at: string;
  due_at: string | null;
  completed_at: string | null;
  anonymous: number;
  timeline_json: string;
  updated_at: string;
}

export interface CreateReportInput {
  id?: string;
  category: IncidentCategory;
  title?: string;
  description?: string;
  photos?: string[];
  lat: number;
  lng: number;
  address: string;
  locationNote?: string;
  anonymous?: boolean;
  phone?: string;
  secretCodeHash?: string;
}

export function sanitizePublicRow(row: StoredReportRow) {
  return {
    id: row.id,
    category: row.category,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    photos: safeParseArray(row.photos_json),
    resultPhotos: safeParseArray(row.result_photos_json),
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    locationNote: row.location_note ?? undefined,
    status: row.status,
    department: row.department,
    createdAt: row.created_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    anonymous: row.anonymous === 1,
    timeline: safeParseArray(row.timeline_json),
  };
}

function safeParseArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listPublicReports(env: Env, limit = 100) {
  if (!env.DB) return null;
  const { results } = await env.DB.prepare(
    `SELECT id, category, title, description, photos_json, result_photos_json,
            lat, lng, address, location_note, status, department,
            created_at, due_at, completed_at, anonymous, timeline_json, updated_at
     FROM reports
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(Math.max(1, Math.min(200, limit)))
    .all<StoredReportRow>();
  return results.map(sanitizePublicRow);
}

export async function insertReport(env: Env, input: CreateReportInput) {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  const id = input.id || `TB-${Date.now().toString().slice(-4)}`;
  const timeline = [{ at: now, status: 'moi', actor: 'Người dân', note: 'Gửi phản ánh mới' }];

  await env.DB.prepare(
    `INSERT INTO reports (
      id, category, title, description, photos_json, result_photos_json,
      lat, lng, address, location_note, status, department,
      created_at, due_at, completed_at, anonymous, phone, secret_code_hash,
      timeline_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'moi', NULL, ?, NULL, NULL, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      input.category,
      input.title ?? null,
      input.description ?? null,
      JSON.stringify(input.photos ?? []),
      input.lat,
      input.lng,
      input.address,
      input.locationNote ?? null,
      now,
      input.anonymous ? 1 : 0,
      input.anonymous ? null : (input.phone ?? null),
      input.secretCodeHash ?? null,
      JSON.stringify(timeline),
      now
    )
    .run();

  return { id, createdAt: now, status: 'moi' as const };
}

export async function updateReportStatus(
  env: Env,
  id: string,
  patch: {
    category?: IncidentCategory;
    title?: string;
    description?: string;
    photos?: string[];
    lat?: number;
    lng?: number;
    address?: string;
    locationNote?: string;
    anonymous?: boolean;
    createdAt?: string;
    status?: string;
    department?: string | null;
    dueAt?: string | null;
    resultPhotos?: string[];
    timeline?: unknown[];
  }
): Promise<boolean | null> {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  const completedAt = patch.status === 'hoan_thanh' || patch.status === 'dong' ? now : null;

  await env.DB.prepare(
    `INSERT INTO reports (
       id, category, title, description, photos_json, result_photos_json,
       lat, lng, address, location_note, status, department,
       created_at, due_at, completed_at, anonymous, timeline_json, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = COALESCE(excluded.status, reports.status),
       department = COALESCE(excluded.department, reports.department),
       due_at = COALESCE(excluded.due_at, reports.due_at),
       result_photos_json = CASE
         WHEN excluded.result_photos_json != '[]' THEN excluded.result_photos_json
         ELSE reports.result_photos_json
       END,
       timeline_json = CASE
         WHEN excluded.timeline_json != '[]' THEN excluded.timeline_json
         ELSE reports.timeline_json
       END,
       completed_at = COALESCE(excluded.completed_at, reports.completed_at),
       updated_at = excluded.updated_at`
  )
    .bind(
      id,
      patch.category ?? 'mat_duong',
      patch.title ?? null,
      patch.description ?? null,
      JSON.stringify(patch.photos ?? []),
      JSON.stringify(patch.resultPhotos ?? []),
      patch.lat ?? 10.9574,
      patch.lng ?? 106.8427,
      patch.address ?? 'P. Trấn Biên',
      patch.locationNote ?? null,
      patch.status ?? 'moi',
      patch.department ?? null,
      patch.createdAt ?? now,
      patch.dueAt ?? null,
      completedAt,
      patch.anonymous ? 1 : 0,
      JSON.stringify(patch.timeline ?? []),
      now
    )
    .run();
  return true;
}

export async function uploadImageToR2(
  env: Env,
  dataUrl: string,
  prefix = 'incidents'
): Promise<{ key: string; url: string; storage: 'r2' | 'inline-fallback' } | null> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) return null;
  const contentType = match[1];
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `${prefix}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  if (!env.MEDIA) {
    return { key, url: dataUrl, storage: 'inline-fallback' };
  }

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType } });
  return { key, url: `/api/uploads/${key}`, storage: 'r2' };
}
