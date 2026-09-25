export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const clean = (v: unknown): string => (v == null ? '' : String(v)).trim();

/* ---------------- תאריכים ----------------
 * הכול נשאר בשעון המקומי. המרה דרך toISOString() הייתה מזיזה את התאריך
 * ביום שלם באזורי זמן מסוימים, ולכן הפורמט נעשה כאן ידנית.
 */

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' של תאריך, לפי השעון המקומי. */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** מפרש 'YYYY-MM-DD' כצהרי אותו יום מקומית, כדי ששעון קיץ לא יזיז אותו. */
export function atNoon(date: Date | string): Date {
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T12:00:00`)
      : new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** מזהה השבוע: תאריך יום ראשון שקדם לתאריך שניתן. */
export function sundayOf(date: Date | string): string {
  const d = atNoon(date);
  d.setDate(d.getDate() - d.getDay());
  return ymd(d);
}

/**
 * היום בשבוע שבו מחלקים את החבילות. 0 = ראשון … 6 = שבת.
 * שינוי כאן משנה רק ימים עתידיים — ימים שכבר נרשמו שומרים את התאריך שלהם.
 */
export const DELIVERY_WEEKDAY = 2; // יום שלישי

/** תאריך יום החלוקה בשבוע שאליו שייך התאריך שניתן. */
export function deliveryDayOf(date: Date | string, weekday: number = DELIVERY_WEEKDAY): string {
  const d = atNoon(date);
  d.setDate(d.getDate() - d.getDay() + weekday);
  return ymd(d);
}

/** N ימי החלוקה האחרונים, מהחדש לישן, כולל זה של השבוע הנוכחי. */
export function recentDeliveryDays(count: number, from: Date | string = new Date()): string[] {
  const first = atNoon(deliveryDayOf(from));
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = atNoon(first);
    d.setDate(d.getDate() - i * 7);
    out.push(ymd(d));
  }
  return out;
}

export const HE_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

/** "יום שלישי, 22/9" */
export function dayLabel(dayId: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayId)) return dayId;
  const d = atNoon(dayId);
  return `יום ${HE_WEEKDAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

/** "22/9/2026" — לשימוש בטבלאות והדפסות. */
export function dayShort(dayId: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayId)) return dayId;
  const d = atNoon(dayId);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** "12/5–18/5" */
export function weekLabel(weekId: string): string {
  if (!weekId) return '';
  const start = atNoon(weekId);
  if (Number.isNaN(start.getTime())) return weekId;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${f(start)}–${f(end)}`;
}

/* ---------------- קישורים ---------------- */

export function telHref(phone: string): string | null {
  const digits = clean(phone).replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

/** ממיר מספר ישראלי מקומי (05X) לפורמט בינלאומי עבור קישור וואטסאפ. */
export function whatsappHref(phone: string): string | null {
  let digits = clean(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export function navigationHref(address: string): string | null {
  const a = clean(address);
  return a ? `https://waze.com/ul?q=${encodeURIComponent(a)}&navigate=yes` : null;
}

/* ---------------- קבצים ---------------- */

function csvCell(value: unknown): string {
  const s = clean(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCSV = (rows: unknown[][]): string =>
  rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

/** מוריד קובץ בדפדפן. BOM כדי ש-Excel יציג עברית נכון. */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * מפרק הדבקה מגיליון. Google Sheets מעתיק עם טאבים; CSV עם פסיקים.
 * שורת כותרת מזוהה ומוסרת.
 */
export function parsePastedRows(text: string): string[][] {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) =>
      (line.includes('\t') ? line.split('\t') : line.split(',')).map((cell) =>
        clean(cell).replace(/^"|"$/g, ''),
      ),
    );
  const first = rows[0];
  if (first && /שם|מס/.test(first.join(''))) return rows.slice(1);
  return rows;
}

export const sortHe = (a: string, b: string): number => clean(a).localeCompare(clean(b), 'he');
