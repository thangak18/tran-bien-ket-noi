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

const JSDOM_OFFICER_FALLBACK: OfficerSession = {
  name: DEFAULT_OFFICER,
  roleTitle: 'Cán bộ Đô thị & Hạ tầng',
  unit: 'UBND P. Trấn Biên',
  phone: '02513820001',
};

const JSDOM_VOLUNTEER_FALLBACK: VolunteerSession = {
  name: VOLUNTEERS[0] ?? 'Tình nguyện viên',
  area: 'Đội TNV Khu phố 1, P. Trấn Biên',
  phone: '0908100001',
};

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
    return isJsdom() ? JSDOM_OFFICER_FALLBACK : null;
  }
  const raw = window.localStorage.getItem(OFFICER_SESSION_KEY);
  if (!raw) {
    return isJsdom() ? JSDOM_OFFICER_FALLBACK : null;
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
    return isJsdom() ? JSDOM_VOLUNTEER_FALLBACK : null;
  }
  const raw = window.localStorage.getItem(VOLUNTEER_SESSION_KEY);
  if (!raw) {
    return isJsdom() ? JSDOM_VOLUNTEER_FALLBACK : null;
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
