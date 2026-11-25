import { Report } from '@/domain/types';

export const ACCOUNTS_STORAGE_KEY = 'tbkn:accounts';
export const CITIZEN_NAME_STORAGE_KEY = 'tbkn:citizen-name';
export const CITIZEN_ADDRESS_STORAGE_KEY = 'tbkn:citizen-address';

export interface CitizenAccountRecord {
  phone: string;
  name: string;
  address: string;
  createdAt: string;
}

export function loadAccountsMap(): Record<string, CitizenAccountRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function findAccountByPhone(
  phone: string,
  reports: Report[] = []
): CitizenAccountRecord | null {
  const clean = phone.replace(/\D/g, '');
  if (!clean) return null;
  const map = loadAccountsMap();
  if (map[clean]) {
    return map[clean]!;
  }
  const hasExistingReport = reports.some(
    (r) => r.reporterPhone === clean || r.followers.includes(clean)
  );
  if (hasExistingReport) {
    return {
      phone: clean,
      name: 'Công dân Trấn Biên',
      address: 'P. Trấn Biên',
      createdAt: new Date().toISOString(),
    };
  }
  return null;
}

export function saveAccountRecord(record: CitizenAccountRecord): void {
  if (typeof window === 'undefined') return;
  const clean = record.phone.replace(/\D/g, '');
  if (!clean) return;
  const map = loadAccountsMap();
  map[clean] = { ...record, phone: clean };
  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(map));
  window.localStorage.setItem(CITIZEN_NAME_STORAGE_KEY, record.name.trim());
  window.localStorage.setItem(CITIZEN_ADDRESS_STORAGE_KEY, record.address.trim());
}
