import type {
  Delivery,
  DeliveryDay,
  DeliveryStatus,
  Driver,
  Family,
  Snapshot,
} from '../types';
import { deliveryId } from '../types';
import { sundayOf, sortHe } from './utils';

/** שורה אחת בלוח יום החלוקה: משפחה אחת, והמסירה שלה באותו יום. */
export interface BoardRow {
  delivery: Delivery;
  /** המשפחה כפי שהיא היום. חסרה אם נמחקה מאז — השם נשאר ברשומת המסירה. */
  family: Family | null;
  name: string;
  address: string;
  phone: string;
  householdSize: number;
}

/** מוביל אחד וכל המשפחות שהוא מביא להן באותו יום. */
export interface BoardGroup {
  driverId: string;
  driverName: string;
  phone: string;
  area: string;
  rows: BoardRow[];
  delivered: number;
  absent: number;
  pending: number;
}

export interface DayBoard {
  dayId: string;
  day: DeliveryDay | null;
  /** true = היום נשמר בבסיס הנתונים. false = זו עדיין רק תוכנית מחושבת. */
  recorded: boolean;
  groups: BoardGroup[];
  total: number;
  delivered: number;
  absent: number;
  pending: number;
  /** כמה מובילים יוצאים לדרך באותו יום. */
  driverCount: number;
  /** סך הנפשות שמקבלות מזון באותו יום. */
  people: number;
}

export const makeDeliveryDay = (dayId: string, boxesPacked = 0): DeliveryDay => ({
  id: dayId,
  weekId: sundayOf(dayId),
  status: 'active',
  notes: '',
  boxesPacked,
  createdAt: new Date().toISOString(),
});

/**
 * התוכנית ליום מסוים: שורת מסירה ריקה לכל משפחה פעילה, עם המוביל המשובץ לה
 * כרגע ועם השמות של הרגע הזה. ברגע שזה נשמר, היום מפסיק להיות תלוי בשיבוץ
 * הנוכחי והופך לתיעוד.
 */
export function planFor(dayId: string, families: Family[], drivers: Driver[]): Delivery[] {
  const byId = new Map(drivers.map((d) => [d.id, d]));
  return families
    .filter((f) => f.active)
    .map((family) => ({
      id: deliveryId(dayId, family.id),
      dayId,
      familyId: family.id,
      familyName: family.name,
      driverId: family.driverId,
      driverName: byId.get(family.driverId)?.name ?? '',
      status: '' as DeliveryStatus,
      markedAt: '',
      notes: '',
    }));
}

/**
 * בונה את לוח יום החלוקה: מי מוביל למי, ומה הסטטוס.
 *
 * אם היום כבר נרשם — הלוח נבנה מרשומות המסירה עצמן, ולכן הוא מראה את המצב
 * כפי שהיה באותו יום. אם היום עוד לא נפתח, הלוח נגזר מהשיבוץ הנוכחי כתצוגה
 * מקדימה בלבד (`recorded: false`).
 */
export function buildDayBoard(snap: Snapshot, dayId: string): DayBoard {
  const day = snap.days.find((d) => d.id === dayId) ?? null;
  const recordedRows = snap.deliveries.filter((d) => d.dayId === dayId);
  const recorded = recordedRows.length > 0;
  const rows = recorded ? recordedRows : planFor(dayId, snap.families, snap.drivers);

  const familyById = new Map(snap.families.map((f) => [f.id, f]));
  const driverById = new Map(snap.drivers.map((d) => [d.id, d]));
  const groups = new Map<string, BoardGroup>();

  for (const delivery of rows) {
    const family = familyById.get(delivery.familyId) ?? null;
    const driver = driverById.get(delivery.driverId);

    let group = groups.get(delivery.driverId);
    if (!group) {
      group = {
        driverId: delivery.driverId,
        // שם מהרשומה קודם: מוביל שנמחק מאז עדיין מופיע בהיסטוריה בשמו.
        driverName: delivery.driverName || driver?.name || '',
        phone: driver?.phone ?? '',
        area: driver?.area ?? '',
        rows: [],
        delivered: 0,
        absent: 0,
        pending: 0,
      };
      groups.set(delivery.driverId, group);
    }

    group.rows.push({
      delivery,
      family,
      name: family?.name || delivery.familyName || '—',
      address: family?.address ?? '',
      phone: family?.phone ?? '',
      householdSize: family?.householdSize ?? 0,
    });

    if (delivery.status === 'delivered') group.delivered += 1;
    else if (delivery.status === 'absent') group.absent += 1;
    else group.pending += 1;
  }

  const ordered = [...groups.values()].sort((a, b) => {
    // "ללא מוביל" תמיד אחרון — זו רשימת טיפול, לא מסלול.
    if (!a.driverId !== !b.driverId) return a.driverId ? -1 : 1;
    return sortHe(a.driverName, b.driverName);
  });
  ordered.forEach((g) => g.rows.sort((a, b) => sortHe(a.name, b.name)));

  const delivered = ordered.reduce((n, g) => n + g.delivered, 0);
  const absent = ordered.reduce((n, g) => n + g.absent, 0);
  const pending = ordered.reduce((n, g) => n + g.pending, 0);

  return {
    dayId,
    day,
    recorded,
    groups: ordered,
    total: rows.length,
    delivered,
    absent,
    pending,
    driverCount: ordered.filter((g) => g.driverId).length,
    people: ordered.reduce(
      (n, g) => n + g.rows.reduce((m, r) => m + (r.householdSize || 0), 0),
      0,
    ),
  };
}

/** כל ימי החלוקה שנרשמו, מהחדש לישן. */
export const sortedDayIds = (snap: Snapshot): string[] =>
  [...new Set(snap.days.map((d) => d.id))].sort().reverse();

/** סיכום קצר לכל יום — לרשימת ההיסטוריה. */
export interface DaySummary {
  dayId: string;
  total: number;
  delivered: number;
  absent: number;
  pending: number;
}

export function summarizeDays(snap: Snapshot): DaySummary[] {
  const byDay = new Map<string, DaySummary>();
  for (const dayId of sortedDayIds(snap)) {
    byDay.set(dayId, { dayId, total: 0, delivered: 0, absent: 0, pending: 0 });
  }
  for (const d of snap.deliveries) {
    let entry = byDay.get(d.dayId);
    if (!entry) {
      entry = { dayId: d.dayId, total: 0, delivered: 0, absent: 0, pending: 0 };
      byDay.set(d.dayId, entry);
    }
    entry.total += 1;
    if (d.status === 'delivered') entry.delivered += 1;
    else if (d.status === 'absent') entry.absent += 1;
    else entry.pending += 1;
  }
  return [...byDay.values()].sort((a, b) => b.dayId.localeCompare(a.dayId));
}
