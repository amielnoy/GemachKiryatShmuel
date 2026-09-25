import type {
  Delivery,
  DeliveryDay,
  DeliveryStatus,
  Driver,
  Family,
  Snapshot,
  Store,
} from '../types';
import { EMPTY_SNAPSHOT, deliveryId } from '../types';
import { sundayOf } from './utils';

const KEY = 'gemach:v2';
const LEGACY_KEY = 'gemach:v1';

/* ---- המבנה הישן, לפני שההיסטוריה קיבלה טבלה משלה ---- */
interface LegacyWeek {
  id: string;
  status: Record<string, { s: DeliveryStatus; t: string }>;
}
interface LegacyPersisted {
  families?: Partial<Family>[];
  drivers?: Partial<Driver>[];
  weeks?: LegacyWeek[];
}

/**
 * ממיר נתונים שנשמרו בגרסה הקודמת. שם לא נשמר מי הוביל כל חבילה, ולכן
 * המוביל הנוכחי של המשפחה הוא ההשערה הטובה ביותר שיש — מכאן והלאה זה נרשם
 * בזמן אמת ולא צריך לנחש.
 */
function migrateLegacy(raw: string): Snapshot | null {
  let parsed: LegacyPersisted;
  try {
    parsed = JSON.parse(raw) as LegacyPersisted;
  } catch {
    return null;
  }

  const families = (parsed.families ?? []).map(normalizeFamily);
  const drivers = (parsed.drivers ?? []).map(normalizeDriver);
  const days: DeliveryDay[] = [];
  const deliveries: Delivery[] = [];

  for (const week of parsed.weeks ?? []) {
    if (!week?.id) continue;
    days.push({
      id: week.id,
      weekId: sundayOf(week.id),
      status: 'closed',
      notes: 'יובא מגרסה קודמת',
      boxesPacked: 0,
      createdAt: '',
    });
    for (const [familyId, mark] of Object.entries(week.status ?? {})) {
      const family = families.find((f) => f.id === familyId);
      const driver = drivers.find((d) => d.id === family?.driverId);
      deliveries.push({
        id: deliveryId(week.id, familyId),
        dayId: week.id,
        familyId,
        familyName: family?.name ?? '',
        driverId: family?.driverId ?? '',
        driverName: driver?.name ?? '',
        status: mark?.s ?? '',
        markedAt: mark?.t ?? '',
        notes: '',
      });
    }
  }

  return { families, drivers, days, deliveries };
}

/** שדות שנוספו אחרי שנתונים כבר נשמרו אצל משתמשים — מקבלים ברירת מחדל. */
function normalizeFamily(f: Partial<Family>): Family {
  return {
    id: f.id ?? '',
    num: f.num ?? '',
    name: f.name ?? '',
    address: f.address ?? '',
    phone: f.phone ?? '',
    phone2: f.phone2 ?? '',
    source: f.source ?? '',
    joinDate: f.joinDate ?? '',
    endDate: f.endDate ?? '',
    notes: f.notes ?? '',
    householdSize: f.householdSize ?? 0,
    active: f.active ?? true,
    driverId: f.driverId ?? '',
  };
}

function normalizeDriver(d: Partial<Driver>): Driver {
  return {
    id: d.id ?? '',
    name: d.name ?? '',
    phone: d.phone ?? '',
    capacity: d.capacity ?? 4,
    area: d.area ?? '',
    joinDate: d.joinDate ?? '',
    notes: d.notes ?? '',
    active: d.active ?? true,
  };
}

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Snapshot>;
      return {
        families: (parsed.families ?? []).map(normalizeFamily),
        drivers: (parsed.drivers ?? []).map(normalizeDriver),
        days: parsed.days ?? [],
        deliveries: parsed.deliveries ?? [],
      };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(legacy);
      if (migrated) {
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    /* מצב פרטי או JSON פגום — מתחילים ריק */
  }
  return { ...EMPTY_SNAPSHOT };
}

function write(data: Snapshot): void {
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

  private mutate(fn: (data: Snapshot) => void): void {
    const data = read();
    fn(data);
    write(data);
    this.listeners.forEach((listener) => listener(data));
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
      // רשומות המסירה נשארות כפי שהן — הן תיעוד של מה שקרה, לא שיבוץ.
    });
  }

  async saveDeliveryDay(day: DeliveryDay): Promise<void> {
    this.mutate((d) => {
      d.days = [...d.days.filter((x) => x.id !== day.id), day];
    });
  }

  async openDeliveryDay(day: DeliveryDay, planned: Delivery[]): Promise<void> {
    this.mutate((d) => {
      if (!d.days.some((x) => x.id === day.id)) d.days = [...d.days, day];
      const existing = new Set(d.deliveries.filter((x) => x.dayId === day.id).map((x) => x.id));
      d.deliveries = [...d.deliveries, ...planned.filter((p) => !existing.has(p.id))];
    });
  }

  async setDeliveryStatus(delivery: Delivery): Promise<void> {
    this.mutate((d) => {
      d.deliveries = [...d.deliveries.filter((x) => x.id !== delivery.id), delivery];
    });
  }

  async importFamilies(families: Family[]): Promise<void> {
    this.mutate((d) => {
      d.families = [...d.families, ...families];
    });
  }

  async seed(snapshot: Snapshot): Promise<void> {
    this.mutate((d) => {
      d.families = mergeById(d.families, snapshot.families);
      d.drivers = mergeById(d.drivers, snapshot.drivers);
      d.days = mergeById(d.days, snapshot.days);
      d.deliveries = mergeById(d.deliveries, snapshot.deliveries);
    });
  }
}

/** מוסיף רק רשומות שהמזהה שלהן עוד לא קיים — טעינה חוזרת לא משכפלת. */
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const have = new Set(existing.map((x) => x.id));
  return [...existing, ...incoming.filter((x) => !have.has(x.id))];
}
