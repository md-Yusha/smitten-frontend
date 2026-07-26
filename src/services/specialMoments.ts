import type { ApiSpecialMoment } from '@/src/services/specialMomentsApi';

export type SpecialMomentPreview = {
  id: string;
  title: string;
  daysLeft: number;
  dateIso?: string;
};

function nextOccurrenceDate(memoryAt: string | Date, now = new Date()): Date {
  const src = typeof memoryAt === 'string'
    ? (() => {
        const parts = memoryAt.slice(0, 10).split('-').map(Number);
        return parts.length === 3 && parts.every(Number.isFinite)
          ? new Date(parts[0], parts[1] - 1, parts[2])
          : new Date(memoryAt);
      })()
    : memoryAt;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), src.getMonth(), src.getDate());
  if (next.getTime() < today.getTime()) next = new Date(now.getFullYear() + 1, src.getMonth(), src.getDate());
  return next;
}

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Days until the next yearly occurrence of a calendar date (anniversaries, birthdays). */
export function daysUntilNextOccurrence(memoryAt: string | Date, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = nextOccurrenceDate(memoryAt, now);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

/** Upcoming special moments sorted by soonest, capped at `limit`. */
export function getUpcomingSpecialMoments(
  moments: ApiSpecialMoment[],
  limit = 3,
): SpecialMomentPreview[] {
  return moments
    .map((m) => {
      const next = nextOccurrenceDate(m.momentAt);
      return { id: m.id, title: m.title, daysLeft: daysUntilNextOccurrence(m.momentAt), dateIso: localIso(next) };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}
