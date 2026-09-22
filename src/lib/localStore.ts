import type {
  DeliveryStatus,
  Driver,
  Family,
  Snapshot,
  Store,
  Week,
} from '../types';
import { EMPTY_SNAPSHOT } from '../types';

const KEY = 'gemach:v1';

interface Persisted {
  families: Family[];
  drivers: Driver[];
  weeks: Week[];
}

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_SNAPSHOT };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      families: parsed.families ?? [],
      drivers: parsed.drivers ?? [],
      weeks: parsed.weeks ?? [],
    };
  } catch {
    return { ...EMPTY_SNAPSHOT };
  }
}

function write(data: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* מצב פרטי או אחסון מלא — ממשיכים בלי לשמור */
  }
}

/**
 * אחסון מקומי במכשיר אחד. משמש כשלא הוגדר Supabase, וגם כדי שהאפליקציה
 * תעבוד מיד אחרי הפריסה לפני שחיברת בסיס נתונים.
 */
export class LocalStore implements Store {
  readonly kind = 'local' as const;
  private listeners = new Set<(s: Snapshot) => void>();

  subscribe(onChange: (snap: Snapshot) => void): () => void {
    this.listeners.add(onChange);
    queueMicrotask(() => onChange(read()));
    // שינויים שנעשו בלשונית אחרת של אותו דפדפן
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) onChange(read());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      this.listeners.delete(onChange);
      window.removeEventListener('storage', onStorage);
    };
  }

  private emit(data: Persisted): void {
    write(data);
    this.listeners.forEach((fn) => fn(data));
  }

  private mutate(fn: (data: Persisted) => void): void {
    const data = read();
    fn(data);
    this.emit(data);
  }

  async saveFamily(family: Family): Promise<void> {
    this.mutate((d) => {
      d.families = [...d.families.filter((f) => f.id !== family.id), family];
    });
  }

  async deleteFamily(id: string): Promise<void> {
    this.mutate((d) => {
      d.families = d.families.filter((f) => f.id !== id);
    });
  }

  async saveDriver(driver: Driver): Promise<void> {
    this.mutate((d) => {
      d.drivers = [...d.drivers.filter((x) => x.id !== driver.id), driver];
    });
  }

  async deleteDriver(id: string): Promise<void> {
    this.mutate((d) => {
      d.drivers = d.drivers.filter((x) => x.id !== id);
      d.families = d.families.map((f) => (f.driverId === id ? { ...f, driverId: '' } : f));
    });
  }

  async setDeliveryStatus(
    weekId: string,
    familyId: string,
    status: DeliveryStatus,
  ): Promise<void> {
    this.mutate((d) => {
      const existing = d.weeks.find((w) => w.id === weekId);
      const mark = { s: status, t: new Date().toISOString() };
      if (existing) {
        existing.status = { ...existing.status, [familyId]: mark };
      } else {
        d.weeks = [...d.weeks, { id: weekId, status: { [familyId]: mark } }];
      }
    });
  }

  async importFamilies(families: Family[]): Promise<void> {
    this.mutate((d) => {
      d.families = [...d.families, ...families];
    });
  }
}
