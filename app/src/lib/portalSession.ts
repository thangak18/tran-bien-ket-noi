import { DEFAULT_OFFICER, VOLUNTEERS } from '@/domain/constants';

export const OFFICER_SESSION_KEY = 'tbkn:officer-session';
export const VOLUNTEER_SESSION_KEY = 'tbkn:volunteer-session';
export const SESSION_CHANGE_EVENT = 'tbkn:session-change';

export interface OfficerSession {
  name: string;
  roleTitle: string;
  unit: string;
  phone: string;
}

export interface VolunteerSession {
  name: string;
  area: string;
  phone: string;
}

export const MOCK_OFFICER_ACCOUNTS: OfficerSession[] = [
  {
    name: DEFAULT_OFFICER,
    roleTitle: 'Cán bộ Đô thị & Hạ tầng',
    unit: 'UBND P. Trấn Biên',
    phone: '02513820001',
  },
  {
    name: 'Trần Quốc Bảo',
    roleTitle: 'Phó Chủ tịch UBND phường',
    unit: 'UBND P. Trấn Biên',
    phone: '02513820002',
  },
];

export const MOCK_VOLUNTEER_ACCOUNTS: VolunteerSession[] = VOLUNTEERS.map((name, idx) => ({
  name,
  area: `Đội TNV Khu phố ${idx + 1}, P. Trấn Biên`,
  phone: `090810000${idx + 1}`,
}));

function isJsdom(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
}

function notifySessionChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

export function getOfficerSession(): OfficerSession | null {
  if (typeof window === 'undefined') {
    return isJsdom() ? MOCK_OFFICER_ACCOUNTS[0]! : null;
  }
  const raw = window.localStorage.getItem(OFFICER_SESSION_KEY);
  if (!raw) {
    return isJsdom() ? MOCK_OFFICER_ACCOUNTS[0]! : null;
  }
  if (raw === 'signed_out') return null;
  try {
    const parsed = JSON.parse(raw) as OfficerSession;
    return parsed?.name ? parsed : null;
  } catch {
    return null;
  }
}

export function setOfficerSession(session: OfficerSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFICER_SESSION_KEY, JSON.stringify(session));
  notifySessionChange();
}

export function clearOfficerSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFICER_SESSION_KEY, 'signed_out');
  notifySessionChange();
}

export function getVolunteerSession(): VolunteerSession | null {
  if (typeof window === 'undefined') {
    return isJsdom() ? MOCK_VOLUNTEER_ACCOUNTS[0]! : null;
  }
  const raw = window.localStorage.getItem(VOLUNTEER_SESSION_KEY);
  if (!raw) {
    return isJsdom() ? MOCK_VOLUNTEER_ACCOUNTS[0]! : null;
  }
  if (raw === 'signed_out') return null;
  try {
    const parsed = JSON.parse(raw) as VolunteerSession;
    return parsed?.name ? parsed : null;
  } catch {
    return null;
  }
}

export function setVolunteerSession(session: VolunteerSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VOLUNTEER_SESSION_KEY, JSON.stringify(session));
  notifySessionChange();
}

export function clearVolunteerSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VOLUNTEER_SESSION_KEY, 'signed_out');
  notifySessionChange();
}
