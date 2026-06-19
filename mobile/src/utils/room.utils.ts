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
