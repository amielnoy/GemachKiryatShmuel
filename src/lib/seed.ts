import type { Delivery, DeliveryDay, DeliveryStatus, Driver, Family, Snapshot } from '../types';
import { deliveryId } from '../types';
import { atNoon, deliveryDayOf, sundayOf, ymd } from './utils';

/**
 * נתוני פתיחה לגמ"ח: 10 מתנדבים מובילים, 10 משפחות, והיסטוריית ימי חלוקה.
 *
 * המזהים קבועים ולא אקראיים ('vol-01', 'fam-01', …), ואותם מזהים בדיוק נמצאים
 * ב-`supabase/seed.sql`. לכן טעינה חוזרת — ולא משנה מאיזו משתי הדרכים — מדלגת
 * על מה שכבר קיים במקום לשכפל אותו.
 */

export const SEED_DRIVERS: Driver[] = [
  { id: 'vol-01', name: 'אבי מזרחי', phone: '050-1110001', capacity: 4, area: 'מרכז', joinDate: '2024-01-14', notes: 'רכב מסחרי גדול', active: true },
  { id: 'vol-02', name: 'רבקה לוי', phone: '052-1110002', capacity: 3, area: 'צפון', joinDate: '2024-02-04', notes: '', active: true },
  { id: 'vol-03', name: 'משה פרידמן', phone: '053-1110003', capacity: 4, area: 'דרום', joinDate: '2024-03-10', notes: 'זמין רק בערב', active: true },
  { id: 'vol-04', name: 'שרה בן-דוד', phone: '054-1110004', capacity: 5, area: 'מרכז', joinDate: '2024-04-21', notes: '', active: true },
  { id: 'vol-05', name: 'יוסף אזולאי', phone: '050-1110005', capacity: 3, area: 'מזרח', joinDate: '2024-06-02', notes: '', active: true },
  { id: 'vol-06', name: 'חנה שטרן', phone: '058-1110006', capacity: 4, area: 'צפון', joinDate: '2024-07-15', notes: 'מגיעה עם הבן', active: true },
  { id: 'vol-07', name: 'דוד אוחיון', phone: '052-1110007', capacity: 2, area: 'מערב', joinDate: '2024-09-08', notes: '', active: true },
  { id: 'vol-08', name: 'מרים גולדברג', phone: '054-1110008', capacity: 4, area: 'מרכז', joinDate: '2025-01-05', notes: 'מחליפה בחופשות', active: true },
  { id: 'vol-09', name: 'אליהו נחום', phone: '053-1110009', capacity: 3, area: 'דרום', joinDate: '2025-02-18', notes: '', active: true },
  { id: 'vol-10', name: 'תמר הלוי', phone: '058-1110010', capacity: 5, area: 'מזרח', joinDate: '2025-05-11', notes: 'רכזת גיבוי', active: true },
];

export const SEED_FAMILIES: Family[] = [
  { id: 'fam-01', num: '101', name: 'משפחת כהן', address: 'הרצל 14, דירה 3', phone: '050-2220001', phone2: '', source: 'רווחה', joinDate: '2024-02-01', endDate: '', notes: 'ללא גלוטן לילד הקטן', householdSize: 5, active: true, driverId: 'vol-01' },
  { id: 'fam-02', num: '102', name: 'משפחת ביטון', address: 'ויצמן 8', phone: '052-2220002', phone2: '050-2220012', source: 'בית הכנסת', joinDate: '2024-02-01', endDate: '', notes: '', householdSize: 7, active: true, driverId: 'vol-01' },
  { id: 'fam-03', num: '103', name: 'משפחת אברהם', address: 'סוקולוב 22, קומה 2', phone: '053-2220003', phone2: '', source: 'רווחה', joinDate: '2024-03-12', endDate: '', notes: 'אין מעלית', householdSize: 3, active: true, driverId: 'vol-02' },
  { id: 'fam-04', num: '104', name: 'משפחת דהן', address: 'בן גוריון 41', phone: '054-2220004', phone2: '', source: 'שכנה', joinDate: '2024-04-02', endDate: '', notes: '', householdSize: 4, active: true, driverId: 'vol-02' },
  { id: 'fam-05', num: '105', name: 'משפחת שמעוני', address: 'האלון 5', phone: '050-2220005', phone2: '', source: 'רווחה', joinDate: '2024-05-20', endDate: '', notes: 'להתקשר לפני הגעה', householdSize: 6, active: true, driverId: 'vol-03' },
  { id: 'fam-06', num: '106', name: 'משפחת נסים', address: 'הזית 17, דירה 8', phone: '058-2220006', phone2: '', source: 'בית הכנסת', joinDate: '2024-08-11', endDate: '', notes: '', householdSize: 2, active: true, driverId: 'vol-04' },
  { id: 'fam-07', num: '107', name: 'משפחת אלמליח', address: 'הגפן 3', phone: '052-2220007', phone2: '054-2220017', source: 'רווחה', joinDate: '2024-10-06', endDate: '', notes: 'אם חד-הורית', householdSize: 4, active: true, driverId: 'vol-04' },
  { id: 'fam-08', num: '108', name: 'משפחת רוזן', address: 'התאנה 29', phone: '053-2220008', phone2: '', source: 'מתנ"ס', joinDate: '2025-01-19', endDate: '', notes: '', householdSize: 8, active: true, driverId: 'vol-05' },
  { id: 'fam-09', num: '109', name: 'משפחת עמר', address: 'הרימון 11, קומה 4', phone: '050-2220009', phone2: '', source: 'רווחה', joinDate: '2025-03-02', endDate: '', notes: 'עברה למוביל אחר ביוני', householdSize: 5, active: true, driverId: 'vol-06' },
  { id: 'fam-10', num: '110', name: 'משפחת טולדנו', address: 'הדקל 6', phone: '054-2220010', phone2: '', source: 'שכן', joinDate: '2025-06-15', endDate: '', notes: '', householdSize: 3, active: true, driverId: 'vol-07' },
];

/**
 * שיבוצים שהיו נכונים בעבר ושונו מאז. הם מוכיחים למה ההיסטוריה נשמרת בנפרד:
 * משפחת עמר עברה ל"חנה שטרן", ובכל זאת ימי החלוקה הישנים ממשיכים להראות
 * שדווקא "משה פרידמן" הוא זה שהביא להם את החבילה.
 */
const PAST_ASSIGNMENTS: Record<string, string> = { 'fam-09': 'vol-03' };
const REASSIGNED_AFTER_DAYS_BACK = 3;

/** מספר יציב מתוך מחרוזת — במקום אקראיות, כדי שהנתונים יֵצאו זהים בכל טעינה. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** ברוב השבועות הכול נמסר; אחת לכמה מסירות מישהו לא היה בבית. */
function pastStatus(familyId: string, dayId: string): DeliveryStatus {
  return hash(`${familyId}|${dayId}`) % 11 === 0 ? 'absent' : 'delivered';
}

function driverAt(family: Family, daysBack: number): string {
  const past = PAST_ASSIGNMENTS[family.id];
  if (past && daysBack > REASSIGNED_AFTER_DAYS_BACK) return past;
  return family.driverId;
}

/** שעת סימון סבירה — אחר הצהריים של יום החלוקה עצמו. */
function markedAt(dayId: string, index: number): string {
  const d = atNoon(dayId);
  d.setHours(16, (index * 7) % 60, 0, 0);
  return d.toISOString();
}

export interface SeedOptions {
  /** התאריך שממנו נספרים ימי החלוקה אחורה. ברירת מחדל: היום. */
  today?: Date | string;
  /** כמה ימי חלוקה לייצר, כולל זה של השבוע הנוכחי. */
  weeks?: number;
}

/**
 * בונה תמונת נתונים מלאה: משפחות, מתנדבים, וכל ימי החלוקה השבועיים
 * עם רשומת מסירה לכל משפחה בכל יום.
 *
 * היום האחרון (של השבוע הנוכחי) נשאר "פעיל" וחלקית מסומן, כדי שמסך
 * החלוקה יֵראה כמו אמצע יום עבודה אמיתי ולא כמו ארכיון סגור.
 */
export function buildSeed({ today = new Date(), weeks = 7 }: SeedOptions = {}): Snapshot {
  const families = SEED_FAMILIES.map((f) => ({ ...f }));
  const drivers = SEED_DRIVERS.map((d) => ({ ...d }));
  const days: DeliveryDay[] = [];
  const deliveries: Delivery[] = [];

  const current = atNoon(deliveryDayOf(today));

  for (let back = 0; back < weeks; back += 1) {
    const d = atNoon(current);
    d.setDate(d.getDate() - back * 7);
    const dayId = ymd(d);
    const isCurrent = back === 0;

    days.push({
      id: dayId,
      weekId: sundayOf(dayId),
      status: isCurrent ? 'active' : 'closed',
      notes: isCurrent ? 'אריזה ב-15:00 במחסן' : '',
      boxesPacked: families.length,
      createdAt: atNoon(dayId).toISOString(),
    });

    families.forEach((family, index) => {
      const driverId = driverAt(family, back);
      // ביום הנוכחי חצי מהמסלולים כבר חזרו, והשאר עוד בדרך.
      const status: DeliveryStatus = isCurrent
        ? index < Math.ceil(families.length / 2)
          ? 'delivered'
          : ''
        : pastStatus(family.id, dayId);

      deliveries.push({
        id: deliveryId(dayId, family.id),
        dayId,
        familyId: family.id,
        familyName: family.name,
        driverId,
        driverName: drivers.find((d) => d.id === driverId)?.name ?? '',
        status,
        markedAt: status ? markedAt(dayId, index) : '',
        notes: '',
      });
    });
  }

  return { families, drivers, days, deliveries };
}
