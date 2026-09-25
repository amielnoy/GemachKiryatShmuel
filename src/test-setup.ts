/**
 * הכנה לבדיקות שרצות בסביבת jsdom.
 *
 * למה זה נחוץ: node 22 ומעלה מגדיר `localStorage` גלובלי משל עצמו, שנשאר
 * undefined בלי הדגל --localstorage-file. vitest מעתיק מ-jsdom רק מפתחות
 * שעוד לא קיימים בסביבה, ולכן הוא מדלג עליו — ובתוך הבדיקה אין localStorage
 * כלל. גם אי אפשר לשלוף אותו מ-jsdom בעצמנו, כי `window` בתוך vitest הוא
 * הגלובל עצמו ולא חלון ה-jsdom.
 *
 * לכן מותקן כאן מימוש זיכרון קטן של Storage. החוזה הזה פשוט דיו שמימוש
 * מקומי שקול לזה של הדפדפן לצורך בדיקת שכבת האחסון.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

if (typeof window !== 'undefined' && !globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
