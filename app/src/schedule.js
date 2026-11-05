// Date helpers. All "dates" are YYYY-MM-DD strings in the family's time zone (TZ env var).

export const TZ = process.env.TZ || 'America/Los_Angeles';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function todayStr(d = new Date()) {
  return fmt.format(d);
}

function toUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(dateStr) {
  return toUTC(dateStr).getUTCDay();
}

export function addDays(dateStr, n) {
  const d = toUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing dateStr. */
export function weekStart(dateStr) {
  return addDays(dateStr, -((weekday(dateStr) + 6) % 7));
}

export function isDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s).getTime());
}

/**
 * The "period" a submission belongs to. One submission per chore, kid and period:
 *  daily / days -> the date
 *  weekly       -> W + Monday of that week (done any one day that week)
 *  once         -> 'once'
 */
export function periodFor(chore, date) {
  switch (chore.repeat) {
    case 'weekly': return 'W' + weekStart(date);
    case 'once': return 'once';
    default: return date;
  }
}

/** Should this chore appear on the given date? (Once-off chores are handled by the caller.) */
export function isScheduled(chore, date) {
  switch (chore.repeat) {
    case 'daily': return true;
    case 'weekly': return true;
    case 'once': return true;
    case 'days': {
      let days = [];
      try { days = JSON.parse(chore.days || '[]'); } catch { /* ignore */ }
      return days.includes(weekday(date));
    }
    default: return false;
  }
}
