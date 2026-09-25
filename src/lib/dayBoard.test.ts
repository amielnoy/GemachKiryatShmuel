import { describe, expect, it } from 'vitest';
import type { Delivery, Driver, Family, Snapshot } from '../types';
import { deliveryId } from '../types';
import {
  buildDayBoard,
  makeDeliveryDay,
  planFor,
  sortedDayIds,
  summarizeDays,
} from './dayBoard';

const DAY = '2026-09-22';
const PREV = '2026-09-15';

const driver = (id: string, name: string, extra: Partial<Driver> = {}): Driver => ({
  id, name, phone: '050-0000000', capacity: 4, area: '', joinDate: '', notes: '', active: true,
  ...extra,
});

const family = (id: string, name: string, driverId: string, extra: Partial<Family> = {}): Family => ({
  id, num: '', name, address: 'רחוב כלשהו 1', phone: '052-0000000', phone2: '',
  source: '', joinDate: '', endDate: '', notes: '', householdSize: 4, active: true, driverId,
  ...extra,
});

const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
  families: [], drivers: [], days: [], deliveries: [], ...over,
});

describe('makeDeliveryDay', () => {
  it('מחשב את השבוע מתוך התאריך', () => {
    expect(makeDeliveryDay(DAY).weekId).toBe('2026-09-20');
  });

  it('נפתח במצב פעיל', () => {
    expect(makeDeliveryDay(DAY).status).toBe('active');
  });

  it('שומר את מספר החבילות שנארזו', () => {
    expect(makeDeliveryDay(DAY, 10).boxesPacked).toBe(10);
  });
});

describe('planFor', () => {
  const drivers = [driver('v1', 'אבי')];
  const families = [
    family('f1', 'כהן', 'v1'),
    family('f2', 'לוי', ''),
    family('f3', 'ארכיון', 'v1', { active: false }),
  ];

  it('מדלג על משפחות בארכיון', () => {
    expect(planFor(DAY, families, drivers).map((d) => d.familyId)).toEqual(['f1', 'f2']);
  });

  it('מייצר מזהה מורכב מהיום והמשפחה', () => {
    expect(planFor(DAY, families, drivers)[0]?.id).toBe(`${DAY}:f1`);
  });

  it('מצלם את שם המוביל לתוך השורה', () => {
    expect(planFor(DAY, families, drivers)[0]?.driverName).toBe('אבי');
  });

  it('משאיר שם מוביל ריק למשפחה לא משובצת', () => {
    expect(planFor(DAY, families, drivers)[1]?.driverName).toBe('');
  });

  it('מתחיל בלי סטטוס ובלי שעת סימון', () => {
    const row = planFor(DAY, families, drivers)[0];
    expect(row?.status).toBe('');
    expect(row?.markedAt).toBe('');
  });
});

describe('buildDayBoard — תצוגה מקדימה לפני שהיום נפתח', () => {
  const snap = snapshot({
    drivers: [driver('v1', 'אבי')],
    families: [family('f1', 'כהן', 'v1')],
  });

  it('מסמן שהיום עוד לא נרשם', () => {
    expect(buildDayBoard(snap, DAY).recorded).toBe(false);
  });

  it('בכל זאת מציג את התוכנית לפי השיבוץ הנוכחי', () => {
    const board = buildDayBoard(snap, DAY);
    expect(board.total).toBe(1);
    expect(board.groups[0]?.driverName).toBe('אבי');
  });

  it('סופר הכול כממתין', () => {
    expect(buildDayBoard(snap, DAY).pending).toBe(1);
  });
});

describe('buildDayBoard — יום שנרשם', () => {
  const delivery = (over: Partial<Delivery>): Delivery => ({
    id: deliveryId(DAY, 'f1'), dayId: DAY, familyId: 'f1', familyName: 'כהן',
    driverId: 'v1', driverName: 'אבי', status: '', markedAt: '', notes: '', ...over,
  });

  const snap = snapshot({
    drivers: [driver('v1', 'אבי', { area: 'מרכז' }), driver('v2', 'רבקה')],
    families: [
      family('f1', 'כהן', 'v1'),
      family('f2', 'לוי', 'v2', { householdSize: 6 }),
      family('f3', 'מזרחי', ''),
    ],
    days: [makeDeliveryDay(DAY)],
    deliveries: [
      delivery({ status: 'delivered', markedAt: '2026-09-22T13:00:00.000Z' }),
      delivery({ id: deliveryId(DAY, 'f2'), familyId: 'f2', familyName: 'לוי', driverId: 'v2', driverName: 'רבקה', status: 'absent' }),
      delivery({ id: deliveryId(DAY, 'f3'), familyId: 'f3', familyName: 'מזרחי', driverId: '', driverName: '' }),
    ],
  });

  const board = buildDayBoard(snap, DAY);

  it('מסמן שהיום נרשם', () => {
    expect(board.recorded).toBe(true);
  });

  it('סופר נמסר, לא בבית וממתין בנפרד', () => {
    expect([board.delivered, board.absent, board.pending]).toEqual([1, 1, 1]);
  });

  it('סופר רק מובילים אמיתיים', () => {
    expect(board.driverCount).toBe(2);
  });

  it('מחבר את מספר הנפשות', () => {
    expect(board.people).toBe(4 + 6 + 4);
  });

  it('מקבץ כל מוביל בנפרד', () => {
    expect(board.groups).toHaveLength(3);
  });

  it('שם את "ללא מוביל" בסוף', () => {
    expect(board.groups.at(-1)?.driverId).toBe('');
  });

  it('ממיין מובילים בעברית', () => {
    expect(board.groups.slice(0, 2).map((g) => g.driverName)).toEqual(['אבי', 'רבקה']);
  });

  it('לוקח אזור וטלפון מרשומת המוביל הנוכחית', () => {
    expect(board.groups[0]?.area).toBe('מרכז');
    expect(board.groups[0]?.phone).toBe('050-0000000');
  });

  it('מצרף את פרטי המשפחה העדכניים לשורה', () => {
    expect(board.groups[0]?.rows[0]?.address).toBe('רחוב כלשהו 1');
  });

  it('סופר לכל מוביל בנפרד', () => {
    expect(board.groups[0]?.delivered).toBe(1);
    expect(board.groups[1]?.absent).toBe(1);
  });

  it('מחזיר את רשומת היום עצמה', () => {
    expect(board.day?.id).toBe(DAY);
  });

  it('מחזיר לוח ריק ליום שלא היה', () => {
    const empty = buildDayBoard(snapshot(), '2020-01-07');
    expect(empty.total).toBe(0);
    expect(empty.groups).toEqual([]);
  });
});

describe('buildDayBoard — ההיסטוריה שורדת שינויים ברשימות', () => {
  /* משפחת כהן עברה מאבי לרבקה. היום הישן חייב להמשיך להראות את אבי. */
  const snap = snapshot({
    drivers: [driver('v1', 'אבי'), driver('v2', 'רבקה')],
    families: [family('f1', 'כהן', 'v2')],
    days: [makeDeliveryDay(PREV), makeDeliveryDay(DAY)],
    deliveries: [
      { id: deliveryId(PREV, 'f1'), dayId: PREV, familyId: 'f1', familyName: 'כהן', driverId: 'v1', driverName: 'אבי', status: 'delivered', markedAt: '', notes: '' },
      { id: deliveryId(DAY, 'f1'), dayId: DAY, familyId: 'f1', familyName: 'כהן', driverId: 'v2', driverName: 'רבקה', status: 'delivered', markedAt: '', notes: '' },
    ],
  });

  it('היום הישן מראה את המוביל שחילק בפועל', () => {
    expect(buildDayBoard(snap, PREV).groups[0]?.driverName).toBe('אבי');
  });

  it('היום הנוכחי מראה את המוביל החדש', () => {
    expect(buildDayBoard(snap, DAY).groups[0]?.driverName).toBe('רבקה');
  });

  it('שם של מוביל שנמחק נשמר מתוך רשומת המסירה', () => {
    const orphaned = snapshot({ ...snap, drivers: [driver('v2', 'רבקה')] });
    expect(buildDayBoard(orphaned, PREV).groups[0]?.driverName).toBe('אבי');
  });

  it('שם של משפחה שנמחקה נשמר מתוך רשומת המסירה', () => {
    const orphaned = snapshot({ ...snap, families: [] });
    const row = buildDayBoard(orphaned, PREV).groups[0]?.rows[0];
    expect(row?.name).toBe('כהן');
    expect(row?.family).toBeNull();
  });

  it('משפחה שנמחקה לא מפילה את חישוב הנפשות', () => {
    const orphaned = snapshot({ ...snap, families: [] });
    expect(buildDayBoard(orphaned, PREV).people).toBe(0);
  });
});

describe('sortedDayIds', () => {
  it('מחזיר מהחדש לישן', () => {
    const snap = snapshot({ days: [makeDeliveryDay(PREV), makeDeliveryDay(DAY)] });
    expect(sortedDayIds(snap)).toEqual([DAY, PREV]);
  });

  it('מחזיר רשימה ריקה כשאין ימים', () => {
    expect(sortedDayIds(snapshot())).toEqual([]);
  });
});

describe('summarizeDays', () => {
  const snap = snapshot({
    days: [makeDeliveryDay(DAY), makeDeliveryDay(PREV)],
    deliveries: [
      { id: `${DAY}:f1`, dayId: DAY, familyId: 'f1', familyName: 'א', driverId: 'v1', driverName: 'אבי', status: 'delivered', markedAt: '', notes: '' },
      { id: `${DAY}:f2`, dayId: DAY, familyId: 'f2', familyName: 'ב', driverId: 'v1', driverName: 'אבי', status: '', markedAt: '', notes: '' },
      { id: `${PREV}:f1`, dayId: PREV, familyId: 'f1', familyName: 'א', driverId: 'v1', driverName: 'אבי', status: 'absent', markedAt: '', notes: '' },
    ],
  });

  it('מסכם כל יום בנפרד', () => {
    expect(summarizeDays(snap)).toHaveLength(2);
  });

  it('שומר על סדר מהחדש לישן', () => {
    expect(summarizeDays(snap).map((d) => d.dayId)).toEqual([DAY, PREV]);
  });

  it('סופר נמסר וממתין', () => {
    const today = summarizeDays(snap)[0];
    expect(today).toMatchObject({ total: 2, delivered: 1, pending: 1, absent: 0 });
  });

  it('סופר לא בבית', () => {
    expect(summarizeDays(snap)[1]).toMatchObject({ total: 1, absent: 1 });
  });

  it('כולל יום שנפתח אך עוד אין בו מסירות', () => {
    const bare = snapshot({ days: [makeDeliveryDay(DAY)] });
    expect(summarizeDays(bare)[0]).toMatchObject({ dayId: DAY, total: 0 });
  });

  it('כולל מסירה שהיום שלה חסר מרשימת הימים', () => {
    const loose = snapshot({
      deliveries: [{ id: `${DAY}:f1`, dayId: DAY, familyId: 'f1', familyName: 'א', driverId: '', driverName: '', status: 'delivered', markedAt: '', notes: '' }],
    });
    expect(summarizeDays(loose)).toEqual([
      { dayId: DAY, total: 1, delivered: 1, absent: 0, pending: 0 },
    ]);
  });
});
