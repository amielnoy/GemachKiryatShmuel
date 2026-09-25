import { describe, expect, it } from 'vitest';
import { SEED_DRIVERS, SEED_FAMILIES, buildSeed } from './seed';
import { buildDayBoard } from './dayBoard';
import { deliveryDayOf } from './utils';

const TODAY = '2026-09-23';

describe('רשימות הפתיחה', () => {
  it('כוללות עשרה מתנדבים מובילים', () => {
    expect(SEED_DRIVERS).toHaveLength(10);
  });

  it('כוללות עשר משפחות', () => {
    expect(SEED_FAMILIES).toHaveLength(10);
  });

  it('מזהי המתנדבים ייחודיים', () => {
    expect(new Set(SEED_DRIVERS.map((d) => d.id)).size).toBe(10);
  });

  it('מזהי המשפחות ייחודיים', () => {
    expect(new Set(SEED_FAMILIES.map((f) => f.id)).size).toBe(10);
  });

  it('לכל מתנדב יש שם וטלפון', () => {
    SEED_DRIVERS.forEach((d) => {
      expect(d.name.length).toBeGreaterThan(1);
      expect(d.phone).toMatch(/^0\d{2}-\d{7}$/);
    });
  });

  it('לכל משפחה יש כתובת ומספר נפשות', () => {
    SEED_FAMILIES.forEach((f) => {
      expect(f.address.length).toBeGreaterThan(1);
      expect(f.householdSize).toBeGreaterThan(0);
    });
  });

  it('כל המשפחות משובצות למוביל קיים', () => {
    const ids = new Set(SEED_DRIVERS.map((d) => d.id));
    SEED_FAMILIES.forEach((f) => expect(ids.has(f.driverId)).toBe(true));
  });

  it('אף מוביל לא חורג מהתקרה שהוגדרה לו', () => {
    SEED_DRIVERS.forEach((d) => {
      const load = SEED_FAMILIES.filter((f) => f.driverId === d.id).length;
      expect(load).toBeLessThanOrEqual(d.capacity);
    });
  });
});

describe('buildSeed', () => {
  const snap = buildSeed({ today: TODAY });

  it('מייצר שבעה ימי חלוקה כברירת מחדל', () => {
    expect(snap.days).toHaveLength(7);
  });

  it('מכבד בקשה למספר שבועות אחר', () => {
    expect(buildSeed({ today: TODAY, weeks: 3 }).days).toHaveLength(3);
  });

  it('היום הראשון הוא יום החלוקה של השבוע הנוכחי', () => {
    expect(snap.days[0]?.id).toBe(deliveryDayOf(TODAY));
  });

  it('כל הימים נופלים על אותו יום בשבוע', () => {
    const weekdays = new Set(snap.days.map((d) => new Date(`${d.id}T12:00:00`).getDay()));
    expect(weekdays.size).toBe(1);
  });

  it('הימים מרווחים בשבוע בדיוק', () => {
    const ids = snap.days.map((d) => d.id);
    expect(ids[0]).toBe('2026-09-22');
    expect(ids[1]).toBe('2026-09-15');
    expect(ids.at(-1)).toBe('2026-08-11');
  });

  it('רושם מסירה לכל משפחה בכל יום', () => {
    expect(snap.deliveries).toHaveLength(7 * 10);
  });

  it('מזהי המסירות ייחודיים', () => {
    expect(new Set(snap.deliveries.map((d) => d.id)).size).toBe(70);
  });

  it('היום הנוכחי פעיל והשאר סגורים', () => {
    expect(snap.days[0]?.status).toBe('active');
    expect(snap.days.slice(1).every((d) => d.status === 'closed')).toBe(true);
  });

  it('היום הנוכחי מסומן חלקית', () => {
    const board = buildDayBoard(snap, '2026-09-22');
    expect(board.delivered).toBe(5);
    expect(board.pending).toBe(5);
  });

  it('ימים קודמים מסומנים במלואם', () => {
    const board = buildDayBoard(snap, '2026-09-15');
    expect(board.pending).toBe(0);
    expect(board.delivered + board.absent).toBe(10);
  });

  it('שומר שם מוביל ושם משפחה בכל מסירה', () => {
    snap.deliveries.forEach((d) => {
      expect(d.familyName).not.toBe('');
      expect(d.driverName).not.toBe('');
    });
  });

  it('שעת סימון קיימת בדיוק כשיש סטטוס', () => {
    snap.deliveries.forEach((d) => {
      expect(Boolean(d.markedAt)).toBe(Boolean(d.status));
    });
  });

  it('דטרמיניסטי — שתי קריאות מחזירות אותו דבר', () => {
    expect(buildSeed({ today: TODAY })).toEqual(buildSeed({ today: TODAY }));
  });
});

describe('buildSeed — היסטוריית שיבוץ אמיתית', () => {
  const snap = buildSeed({ today: TODAY });

  it('משפחת עמר משובצת היום לחנה שטרן', () => {
    expect(buildDayBoard(snap, '2026-09-22').groups.find((g) => g.driverId === 'vol-06')
      ?.rows.some((r) => r.delivery.familyId === 'fam-09')).toBe(true);
  });

  it('אבל בימים הישנים היא מופיעה אצל משה פרידמן', () => {
    const old = snap.days.at(-1)!.id;
    const row = snap.deliveries.find((d) => d.dayId === old && d.familyId === 'fam-09');
    expect(row?.driverId).toBe('vol-03');
    expect(row?.driverName).toBe('משה פרידמן');
  });

  it('המעבר קורה בנקודה אחת בזמן, לא לסירוגין', () => {
    const byDay = snap.days.map(
      (d) => snap.deliveries.find((x) => x.dayId === d.id && x.familyId === 'fam-09')?.driverId,
    );
    // הימים ממוינים מהחדש לישן: קודם רצף של המוביל החדש, ואז רצף של הישן.
    const firstOld = byDay.indexOf('vol-03');
    expect(firstOld).toBeGreaterThan(0);
    expect(byDay.slice(0, firstOld).every((v) => v === 'vol-06')).toBe(true);
    expect(byDay.slice(firstOld).every((v) => v === 'vol-03')).toBe(true);
  });
});
