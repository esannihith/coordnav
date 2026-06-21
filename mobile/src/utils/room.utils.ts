export function memberInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function normalizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[ILO01]/g, '')
    .slice(0, 6);
}

export const MEMBER_LIVENESS_TIMEOUT_MS = 25000;
export const MEMBER_DEAD_TIMEOUT_MS = 60000;

export function getLocationAgeMs(updatedAt?: string): number {
  if (!updatedAt) return Infinity;
  return Date.now() - new Date(updatedAt).getTime();
}

export function isLocationActive(updatedAt?: string): boolean {
  return getLocationAgeMs(updatedAt) < MEMBER_LIVENESS_TIMEOUT_MS;
}

export function isLocationStale(updatedAt?: string): boolean {
  return getLocationAgeMs(updatedAt) >= MEMBER_LIVENESS_TIMEOUT_MS;
}

export function isLocationDead(updatedAt?: string): boolean {
  return getLocationAgeMs(updatedAt) > MEMBER_DEAD_TIMEOUT_MS;
}
