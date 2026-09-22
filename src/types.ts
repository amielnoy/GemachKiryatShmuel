/** סטטוס מסירה של חבילה בשבוע מסוים. מחרוזת ריקה = טרם נמסר. */
export type DeliveryStatus = 'delivered' | 'absent' | '';

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
  notes: string;
  active: boolean;
}

export interface DeliveryMark {
  s: DeliveryStatus;
  /** חותמת זמן ISO של הסימון. */
  t: string;
}

/** שבוע חלוקה. המזהה הוא תאריך יום ראשון בפורמט YYYY-MM-DD. */
export interface Week {
  id: string;
  status: Record<string, DeliveryMark>;
}

export interface Snapshot {
  families: Family[];
  drivers: Driver[];
  weeks: Week[];
}

export const EMPTY_SNAPSHOT: Snapshot = { families: [], drivers: [], weeks: [] };

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
  /** מסמן מסירה. ממוזג ברמת השדה כדי שסימונים מקבילים לא ידרסו זה את זה. */
  setDeliveryStatus(weekId: string, familyId: string, status: DeliveryStatus): Promise<void>;
  importFamilies(families: Family[]): Promise<void>;
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
  active: true,
  driverId: '',
});

export const emptyDriver = (): Driver => ({
  id: '',
  name: '',
  phone: '',
  capacity: 4,
  notes: '',
  active: true,
});
