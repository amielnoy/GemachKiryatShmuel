export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const clean = (v: unknown): string => (v == null ? '' : String(v)).trim();

/** מזהה השבוע: תאריך יום ראשון שקדם לתאריך שניתן. */
export function sundayOf(date: Date | string): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

/** "12/5–18/5" */
export function weekLabel(weekId: string): string {
  if (!weekId) return '';
  const start = new Date(`${weekId}T12:00:00`);
  if (Number.isNaN(start.getTime())) return weekId;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${f(start)}–${f(end)}`;
}

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

function csvCell(value: unknown): string {
  const s = clean(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCSV = (rows: unknown[][]): string =>
  rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

/** מוריד קובץ בדפדפן. BOM כדי ש-Excel יציג עברית נכון. */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
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
