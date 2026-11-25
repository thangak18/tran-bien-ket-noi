export type PortalMode = 'all' | 'citizen' | 'officer' | 'volunteer' | 'admin';

const VALID_MODES: readonly PortalMode[] = ['all', 'citizen', 'officer', 'volunteer', 'admin'];

export function resolvePortalMode(raw?: string): PortalMode {
  const normalized = (raw ?? '').trim().toLowerCase() as PortalMode;
  return VALID_MODES.includes(normalized) ? normalized : 'all';
}

export function getPortalMode(): PortalMode {
  return resolvePortalMode(import.meta.env.VITE_PORTAL_MODE as string | undefined);
}

export function isPortalEnabled(
  portal: Exclude<PortalMode, 'all'>,
  mode: PortalMode = getPortalMode()
): boolean {
  return mode === 'all' || mode === portal;
}

export function getDefaultPortalPath(mode: PortalMode = getPortalMode()): string {
  switch (mode) {
    case 'officer':
      return '/can-bo';
    case 'volunteer':
      return '/tnv';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}
