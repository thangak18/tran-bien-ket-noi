import { sqlClient } from './db/client';

export interface ClockService {
  now(): string;
  nowDate(): Date;
}

// Fallback fixed time for seed data / demo mode
export const DEMO_NOW_ISO = '2026-11-24T09:00:00+07:00';

let cachedFixedAt: string | null = null;
let lastCheckMs = 0;

export async function getDemoNow(): Promise<string> {
  const currentMs = Date.now();
  // Cache for 30s
  if (cachedFixedAt && currentMs - lastCheckMs < 30000) {
    return cachedFixedAt;
  }

  try {
    const [row] = await sqlClient`SELECT value FROM app_settings WHERE key = 'clock' LIMIT 1;`;
    if (row?.value && typeof row.value === 'object' && 'fixedAt' in row.value) {
      cachedFixedAt = row.value.fixedAt as string;
      lastCheckMs = currentMs;
      return cachedFixedAt;
    }
  } catch {
    // If DB is offline or not seeded yet, fallback to default demo now
  }

  cachedFixedAt = DEMO_NOW_ISO;
  lastCheckMs = currentMs;
  return cachedFixedAt;
}

export function formatVietnamTime(date: Date = new Date()): string {
  // Format as YYYY-MM-DDTHH:mm:ss+07:00
  const tzOffset = 7 * 60; // minutes
  const localDate = new Date(date.getTime() + tzOffset * 60 * 1000);
  const iso = localDate.toISOString();
  return `${iso.slice(0, 19)}+07:00`;
}
