/** סטטוס מסירה של חבילה ביום חלוקה מסוים. מחרוזת ריקה = טרם נמסר. */
export type DeliveryStatus = 'delivered' | 'absent' | '';

/** מצב יום החלוקה: מתוכנן · פעיל (מחלקים עכשיו) · נסגר (היסטוריה). */
export type DayStatus = 'planned' | 'active' | 'closed';

/** משפחה מקבלת חבילה. */
export interface Family {
  id: string;
  num: string;
  name: string;
  address: string;
  phone: string;
  phone2: string;
  /** הגורם שהפנה את המשפחה לגמ"ח. */
  source: string;
  joinDate: string;
  endDate: string;
  notes: string;
  /** מספר הנפשות בבית — קובע את גודל החבילה. */
  householdSize: number;
  /** false = בארכיון, לא מקבלת חבילה שבועית. */
  active: boolean;
  /** מזהה המוביל המשובץ, או מחרוזת ריקה. */
  driverId: string;
}

/** מתנדב שמוביל חבילות. */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  /** כמה חבילות הוא מוכן להוביל בשבוע. */
  capacity: number;
  /** האזור שבו הוא מחלק — עוזר לשיבוץ ידני. */
  area: string;
  joinDate: string;
  notes: string;
  active: boolean;
}

/**
 * יום חלוקה אחד. המזהה הוא תאריך היום עצמו (YYYY-MM-DD), למשל '2026-09-22'.
 * נשמר לעד: גם אחרי שהמשפחות והמובילים משתנים, היום הזה נשאר כפי שהיה.
 */
export interface DeliveryDay {
  id: string;
  /** יום ראשון של אותו שבוע — כדי לקבץ ולמיין לפי שבועות. */
  weekId: string;
  status: DayStatus;
  notes: string;
  /** כמה חבילות נארזו במחסן באותו יום. */
  boxesPacked: number;
  createdAt: string;
}

/**
 * רשומת מסירה אחת — מי הוביל ומי קיבל, ביום מסוים.
 *
 * זו טבלת עובדות: היא מתעדת מה קרה, לא מה מתוכנן עכשיו. לכן המוביל והשמות
 * נשמרים כאן כצילום מצב של אותו רגע. אם המשפחה תעבור מחר למוביל אחר, או
 * שהמוביל יימחק מהרשימה, היום הזה ימשיך להיקרא בדיוק כפי שהיה.
 */
export interface Delivery {
  /** `${dayId}:${familyId}` — מסירה אחת לכל משפחה בכל יום. */
  id: string;
  dayId: string;
  familyId: string;
  /** שם המשפחה כפי שהיה באותו יום. */
  familyName: string;
  driverId: string;
  /** שם המוביל כפי שהיה באותו יום. ריק = לא היה משובץ מוביל. */
  driverName: string;
  status: DeliveryStatus;
  /** חותמת זמן ISO של הסימון האחרון. ריק = עוד לא סומן. */
  markedAt: string;
  notes: string;
}

export interface Snapshot {
  families: Family[];
  drivers: Driver[];
  days: DeliveryDay[];
  deliveries: Delivery[];
}

export const EMPTY_SNAPSHOT: Snapshot = {
  families: [],
  drivers: [],
  days: [],
  deliveries: [],
};

export const deliveryId = (dayId: string, familyId: string): string => `${dayId}:${familyId}`;

/**
 * חוזה האחסון. יש שני מימושים: LocalStore (localStorage, מכשיר בודד)
 * ו-SupabaseStore (משותף לכל המתנדבים). המסכים לא יודעים באיזה מהם מדובר.
 */
export interface Store {
  readonly kind: 'local' | 'supabase';
  /** נקרא מיד עם התמונה הנוכחית, ושוב בכל שינוי. מחזיר פונקציית ביטול. */
  subscribe(onChange: (snap: Snapshot) => void): () => void;
  saveFamily(family: Family): Promise<void>;
  deleteFamily(id: string): Promise<void>;
  saveDriver(driver: Driver): Promise<void>;
  deleteDriver(id: string): Promise<void>;
  saveDeliveryDay(day: DeliveryDay): Promise<void>;
  /**
   * פותח יום חלוקה ורושם שורת מסירה לכל משפחה פעילה, עם המוביל המשובץ לה
   * כרגע. זה מה שהופך את התכנון לנתון שמור. שורות קיימות לא נדרסות.
   */
  openDeliveryDay(day: DeliveryDay, planned: Delivery[]): Promise<void>;
  /** מסמן מסירה. ממוזג ברמת השורה כדי שסימונים מקבילים לא ידרסו זה את זה. */
  setDeliveryStatus(delivery: Delivery): Promise<void>;
  importFamilies(families: Family[]): Promise<void>;
  /** טוען נתוני פתיחה. לא מוחק את הקיים — מדלג על מזהים שכבר קיימים. */
  seed(snapshot: Snapshot): Promise<void>;
}

export const emptyFamily = (): Family => ({
  id: '',
  num: '',
  name: '',
  address: '',
  phone: '',
  phone2: '',
  source: '',
  joinDate: '',
  endDate: '',
  notes: '',
  householdSize: 4,
  active: true,
  driverId: '',
});

export const emptyDriver = (): Driver => ({
  id: '',
  name: '',
  phone: '',
  capacity: 4,
  area: '',
  joinDate: '',
  notes: '',
  active: true,
});
