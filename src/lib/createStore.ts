import type { Store } from '../types';
import { LocalStore } from './localStore';
import { SupabaseStore } from './supabaseStore';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * בוחר אחסון לפי משתני הסביבה. בלי Supabase מוגדר האפליקציה עדיין עובדת,
 * אבל הנתונים נשארים במכשיר אחד — לכן המסך מציג על כך אזהרה.
 */
export function createStore(): Store {
  if (url && anonKey) {
    try {
      return new SupabaseStore(url, anonKey);
    } catch (err) {
      console.error('[gemach] חיבור ל-Supabase נכשל, עוברים לאחסון מקומי', err);
    }
  }
  return new LocalStore();
}

/* ---------------- הרשאת רכז ----------------
 * גדר נוחות, לא אבטחה: היא מונעת ממתנדב למחוק בטעות את רשימת המשפחות,
 * אבל מי שיפתח את קוד הדף יראה את הקוד. ראו הערה ב-README.
 */
const COORDINATOR_CODE = import.meta.env.VITE_COORDINATOR_CODE ?? '';
const UNLOCK_KEY = 'gemach:coordinator';

/** בלי קוד מוגדר כולם רכזים — כך האפליקציה שמישה מיד אחרי הפריסה. */
export const coordinatorCodeRequired = (): boolean => COORDINATOR_CODE.length > 0;

export function isCoordinator(): boolean {
  if (!coordinatorCodeRequired()) return true;
  try {
    return localStorage.getItem(UNLOCK_KEY) === COORDINATOR_CODE;
  } catch {
    return false;
  }
}

export function tryUnlock(code: string): boolean {
  if (code !== COORDINATOR_CODE) return false;
  try {
    localStorage.setItem(UNLOCK_KEY, code);
  } catch {
    /* ללא שמירה — יידרש קוד שוב בטעינה הבאה */
  }
  return true;
}

export function lockCoordinator(): void {
  try {
    localStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* אין מה לעשות */
  }
}

/* ---------------- זהות המוביל ---------------- */
const MY_DRIVER_KEY = 'gemach:mydriver';

export function getMyDriverId(): string | null {
  try {
    return localStorage.getItem(MY_DRIVER_KEY);
  } catch {
    return null;
  }
}

export function setMyDriverId(id: string | null): void {
  try {
    if (id) localStorage.setItem(MY_DRIVER_KEY, id);
    else localStorage.removeItem(MY_DRIVER_KEY);
  } catch {
    /* אין מה לעשות */
  }
}
