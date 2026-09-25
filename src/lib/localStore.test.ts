// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Delivery, Driver, Family, Snapshot } from '../types';
import { LocalStore } from './localStore';
import { makeDeliveryDay, planFor } from './dayBoard';
import { buildSeed } from './seed';

const DAY = '2026-09-22';

const driver = (id: string, name: string): Driver => ({
  id, name, phone: '', capacity: 4, area: '', joinDate: '', notes: '', active: true,
});

const family = (id: string, name: string, driverId = ''): Family => ({
  id, num: '', name, address: '', phone: '', phone2: '', source: '', joinDate: '',
  endDate: '', notes: '', householdSize: 3, active: true, driverId,
});

/** קורא את התמונה הנוכחית מהחנות דרך המנוי, ומנתק מיד. */
async function snapshotOf(store: LocalStore): Promise<Snapshot> {
  return new Promise((resolve) => {
    const stop = store.subscribe((snap) => {
      resolve(snap);
      queueMicrotask(stop);
    });
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('LocalStore — משפחות ומובילים', () => {
  it('מתחיל ריק', async () => {
    expect(await snapshotOf(new LocalStore())).toEqual({
      families: [], drivers: [], days: [], deliveries: [],
    });
  });

  it('שומר משפחה', async () => {
    const store = new LocalStore();
    await store.saveFamily(family('f1', 'כהן'));
    expect((await snapshotOf(store)).families).toHaveLength(1);
  });

  it('שמירה חוזרת מעדכנת ולא מוסיפה', async () => {
    const store = new LocalStore();
    await store.saveFamily(family('f1', 'כהן'));
    await store.saveFamily({ ...family('f1', 'כהן-לוי') });
    const snap = await snapshotOf(store);
    expect(snap.families).toHaveLength(1);
    expect(snap.families[0]?.name).toBe('כהן-לוי');
  });

  it('מוחק משפחה', async () => {
    const store = new LocalStore();
    await store.saveFamily(family('f1', 'כהן'));
    await store.deleteFamily('f1');
    expect((await snapshotOf(store)).families).toEqual([]);
  });

  it('מחיקת מוביל מפנה את המשפחות שלו', async () => {
    const store = new LocalStore();
    await store.saveDriver(driver('v1', 'אבי'));
    await store.saveFamily(family('f1', 'כהן', 'v1'));
    await store.deleteDriver('v1');
    const snap = await snapshotOf(store);
    expect(snap.drivers).toEqual([]);
    expect(snap.families[0]?.driverId).toBe('');
  });

  it('מחיקת מוביל לא מוחקת את ההיסטוריה שלו', async () => {
    const store = new LocalStore();
    await store.saveDriver(driver('v1', 'אבי'));
    await store.saveFamily(family('f1', 'כהן', 'v1'));
    await store.openDeliveryDay(makeDeliveryDay(DAY), planFor(DAY, [family('f1', 'כהן', 'v1')], [driver('v1', 'אבי')]));
    await store.deleteDriver('v1');
    const snap = await snapshotOf(store);
    expect(snap.deliveries).toHaveLength(1);
    expect(snap.deliveries[0]?.driverName).toBe('אבי');
  });

  it('מייבא כמה משפחות בבת אחת', async () => {
    const store = new LocalStore();
    await store.importFamilies([family('f1', 'כהן'), family('f2', 'לוי')]);
    expect((await snapshotOf(store)).families).toHaveLength(2);
  });

  it('שומר בין מופעים של החנות', async () => {
    await new LocalStore().saveFamily(family('f1', 'כהן'));
    expect((await snapshotOf(new LocalStore())).families).toHaveLength(1);
  });
});

describe('LocalStore — ימי חלוקה', () => {
  const families = [family('f1', 'כהן', 'v1'), family('f2', 'לוי', 'v1')];
  const drivers = [driver('v1', 'אבי')];

  const opened = async () => {
    const store = new LocalStore();
    await store.openDeliveryDay(makeDeliveryDay(DAY, 2), planFor(DAY, families, drivers));
    return store;
  };

  it('פתיחת יום יוצרת שורת מסירה לכל משפחה', async () => {
    const snap = await snapshotOf(await opened());
    expect(snap.days).toHaveLength(1);
    expect(snap.deliveries).toHaveLength(2);
  });

  it('פתיחה חוזרת לא משכפלת שורות', async () => {
    const store = await opened();
    await store.openDeliveryDay(makeDeliveryDay(DAY, 2), planFor(DAY, families, drivers));
    const snap = await snapshotOf(store);
    expect(snap.days).toHaveLength(1);
    expect(snap.deliveries).toHaveLength(2);
  });

  it('פתיחה חוזרת לא מוחקת סימון שכבר נעשה', async () => {
    const store = await opened();
    const marked: Delivery = {
      ...planFor(DAY, families, drivers)[0]!,
      status: 'delivered',
      markedAt: '2026-09-22T13:00:00.000Z',
    };
    await store.setDeliveryStatus(marked);
    await store.openDeliveryDay(makeDeliveryDay(DAY, 2), planFor(DAY, families, drivers));
    const snap = await snapshotOf(store);
    expect(snap.deliveries.find((d) => d.familyId === 'f1')?.status).toBe('delivered');
  });

  it('סימון מסירה נשמר', async () => {
    const store = await opened();
    await store.setDeliveryStatus({
      ...planFor(DAY, families, drivers)[1]!, status: 'absent', markedAt: 'x',
    });
    const snap = await snapshotOf(store);
    expect(snap.deliveries.find((d) => d.familyId === 'f2')?.status).toBe('absent');
    expect(snap.deliveries).toHaveLength(2);
  });

  it('שומר עדכון לרשומת היום עצמה', async () => {
    const store = await opened();
    await store.saveDeliveryDay({ ...makeDeliveryDay(DAY, 2), status: 'closed', notes: 'הסתיים' });
    const snap = await snapshotOf(store);
    expect(snap.days).toHaveLength(1);
    expect(snap.days[0]?.status).toBe('closed');
  });
});

describe('LocalStore — טעינת נתוני הדגמה', () => {
  it('טוענת את כל הרשומות', async () => {
    const store = new LocalStore();
    await store.seed(buildSeed({ today: '2026-09-23' }));
    const snap = await snapshotOf(store);
    expect(snap.families).toHaveLength(10);
    expect(snap.drivers).toHaveLength(10);
    expect(snap.days).toHaveLength(7);
    expect(snap.deliveries).toHaveLength(70);
  });

  it('טעינה חוזרת לא משכפלת', async () => {
    const store = new LocalStore();
    await store.seed(buildSeed({ today: '2026-09-23' }));
    await store.seed(buildSeed({ today: '2026-09-23' }));
    const snap = await snapshotOf(store);
    expect(snap.families).toHaveLength(10);
    expect(snap.deliveries).toHaveLength(70);
  });

  it('לא דורסת עריכה שנעשתה לרשומה קיימת', async () => {
    const store = new LocalStore();
    await store.seed(buildSeed({ today: '2026-09-23' }));
    await store.saveFamily({ ...family('fam-01', 'שם שהרכז שינה') });
    await store.seed(buildSeed({ today: '2026-09-23' }));
    const snap = await snapshotOf(store);
    expect(snap.families.find((f) => f.id === 'fam-01')?.name).toBe('שם שהרכז שינה');
  });
});

describe('LocalStore — מיגרציה מהמבנה הישן', () => {
  const legacy = {
    families: [{ id: 'f1', name: 'כהן', driverId: 'v1', active: true }],
    drivers: [{ id: 'v1', name: 'אבי' }],
    weeks: [{ id: '2026-09-20', status: { f1: { s: 'delivered', t: '2026-09-20T10:00:00.000Z' } } }],
  };

  beforeEach(() => {
    localStorage.setItem('gemach:v1', JSON.stringify(legacy));
  });

  it('קוראת את המשפחות והמובילים הישנים', async () => {
    const snap = await snapshotOf(new LocalStore());
    expect(snap.families).toHaveLength(1);
    expect(snap.drivers).toHaveLength(1);
  });

  it('ממלאת ברירת מחדל לשדות שלא היו קיימים', async () => {
    const snap = await snapshotOf(new LocalStore());
    expect(snap.families[0]?.householdSize).toBe(0);
    expect(snap.drivers[0]?.area).toBe('');
    expect(snap.drivers[0]?.capacity).toBe(4);
  });

  it('הופכת כל שבוע ליום חלוקה', async () => {
    const snap = await snapshotOf(new LocalStore());
    expect(snap.days).toHaveLength(1);
    expect(snap.days[0]?.status).toBe('closed');
  });

  it('הופכת כל סימון לרשומת מסירה', async () => {
    const snap = await snapshotOf(new LocalStore());
    expect(snap.deliveries).toHaveLength(1);
    expect(snap.deliveries[0]).toMatchObject({
      dayId: '2026-09-20',
      familyId: 'f1',
      status: 'delivered',
      markedAt: '2026-09-20T10:00:00.000Z',
    });
  });

  it('משלימה את המוביל מהשיבוץ הנוכחי, כי הישן לא נשמר', async () => {
    const snap = await snapshotOf(new LocalStore());
    expect(snap.deliveries[0]?.driverId).toBe('v1');
    expect(snap.deliveries[0]?.driverName).toBe('אבי');
  });

  it('רצה פעם אחת בלבד ואז קוראת מהמפתח החדש', async () => {
    await snapshotOf(new LocalStore());
    expect(localStorage.getItem('gemach:v2')).not.toBeNull();
    localStorage.setItem('gemach:v1', JSON.stringify({ families: [], drivers: [], weeks: [] }));
    expect((await snapshotOf(new LocalStore())).families).toHaveLength(1);
  });

  it('לא נופלת על JSON פגום', async () => {
    localStorage.setItem('gemach:v1', '{לא json}');
    expect((await snapshotOf(new LocalStore())).families).toEqual([]);
  });
});
