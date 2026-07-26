/** Standard disappearing-message windows (aligned with common messenger UX). */
export type DisappearingOption = {
  id: string;
  label: string;
  subtitle: string;
  /** `null` = messages do not auto-delete */
  ttlMs: number | null;
};

export const DISAPPEARING_MESSAGE_OPTIONS: DisappearingOption[] = [
  { id: 'off', label: 'Off', subtitle: 'Messages stay until you delete them', ttlMs: null },
  { id: '30s', label: '30 seconds', subtitle: 'After they are sent', ttlMs: 30 * 1000 },
  { id: '24h', label: '24 hours', subtitle: 'After they are sent', ttlMs: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 days', subtitle: 'After they are sent', ttlMs: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 days', subtitle: 'After they are sent', ttlMs: 30 * 24 * 60 * 60 * 1000 },
];

export function formatDisappearingLabel(ttlMs: number | null): string {
  if (ttlMs === null) return 'Off';
  const opt = DISAPPEARING_MESSAGE_OPTIONS.find((o) => o.ttlMs === ttlMs);
  if (opt) return opt.label;
  
  const seconds = Math.floor(ttlMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0 && hours % 24 === 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0 && minutes % 60 === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0 && seconds % 60 === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}
