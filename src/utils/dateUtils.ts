const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRelativeIsoDate(offsetDays: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
  return target.toISOString().slice(0, 10);
}

export function formatShortMonthDay(offsetDays: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
  return `${MONTHS_SHORT[target.getUTCMonth()]} ${String(target.getUTCDate()).padStart(2, '0')}`;
}

export function formatRelativeDue(
  offsetDays: number,
  time = '23:59'
): { dueDate: string; dueFormatted: string; daysLeft: number } {
  const md = formatShortMonthDay(offsetDays);
  return {
    dueDate: `Due ${md}`,
    dueFormatted: `${md}, ${time}`,
    daysLeft: Math.max(0, offsetDays),
  };
}

export function getCurrentMondayUtcMs(): number {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
}

export interface WeekDayColumn {
  name: string;
  date: string;
  fullDate: string;
  dayIndex: number;
  isoDate: string;
  isToday: boolean;
}

export interface WeekSummaryInfo {
  days: WeekDayColumn[];
  rangeLabel: string;
  activeWeekIso: string;
  mondayMs: number;
}

export function getWeekSummaryInfo(offsetWeeks: number): WeekSummaryInfo {
  const mondayMs = getCurrentMondayUtcMs() + offsetWeeks * 7 * DAY_MS;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIso = getTodayIsoDate();

  const days: WeekDayColumn[] = dayNames.map((name, idx) => {
    const d = new Date(mondayMs + idx * DAY_MS);
    const monthStr = MONTHS_SHORT[d.getUTCMonth()];
    const dayNum = String(d.getUTCDate()).padStart(2, '0');
    const isoDate = d.toISOString().slice(0, 10);
    return {
      name,
      date: dayNum,
      fullDate: `${fullDayNames[idx]}, ${monthStr} ${dayNum}`,
      dayIndex: idx,
      isoDate,
      isToday: isoDate === todayIso,
    };
  });

  const start = new Date(mondayMs);
  const end = new Date(mondayMs + 5 * DAY_MS);
  const startMonth = MONTHS_SHORT[start.getUTCMonth()];
  const endMonth = MONTHS_SHORT[end.getUTCMonth()];
  const rangeLabel =
    startMonth === endMonth
      ? `${startMonth} ${start.getUTCDate()} - ${end.getUTCDate()}, ${start.getUTCFullYear()}`
      : `${startMonth} ${start.getUTCDate()} - ${endMonth} ${end.getUTCDate()}, ${start.getUTCFullYear()}`;

  const activeWeekIso = new Date(mondayMs).toISOString().slice(0, 10);

  return {
    days,
    rangeLabel,
    activeWeekIso,
    mondayMs,
  };
}
