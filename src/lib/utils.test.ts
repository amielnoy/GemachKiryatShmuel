import { describe, expect, it } from 'vitest';
import {
  DELIVERY_WEEKDAY,
  atNoon,
  clean,
  dayLabel,
  dayShort,
  deliveryDayOf,
  navigationHref,
  parsePastedRows,
  recentDeliveryDays,
  sortHe,
  sundayOf,
  telHref,
  toCSV,
  uid,
  weekLabel,
  whatsappHref,
  ymd,
} from './utils';

/* בכל הבדיקות משתמשים בתאריכי YYYY-MM-DD בלבד, והפונקציות עובדות בשעון
   המקומי — ולכן התוצאות זהות גם כש-CI רץ ב-UTC. */

describe('clean', () => {
  it('מקצץ רווחים', () => {
    expect(clean('  שלום  ')).toBe('שלום');
  });

  it('מחזיר מחרוזת ריקה עבור null ו-undefined', () => {
    expect(clean(null)).toBe('');
    expect(clean(undefined)).toBe('');
  });

  it('ממיר מספרים למחרוזת', () => {
    expect(clean(42)).toBe('42');
    expect(clean(0)).toBe('0');
  });
});

describe('uid', () => {
  it('מחזיר מזהה לא ריק', () => {
    expect(uid().length).toBeGreaterThan(4);
  });

  it('לא חוזר על עצמו', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uid()));
    expect(ids.size).toBe(500);
  });
});

describe('ymd', () => {
  it('מרפד חודש ויום בספרה מובילה', () => {
    expect(ymd(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('שומר על חודש דו-ספרתי', () => {
    expect(ymd(new Date(2026, 11, 31, 12))).toBe('2026-12-31');
  });
});

describe('atNoon', () => {
  it('מפרש מחרוזת תאריך כצהרי אותו יום מקומית', () => {
    const d = atNoon('2026-09-22');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(12);
  });

  it('מאפס את השעה גם עבור אובייקט Date', () => {
    expect(atNoon(new Date(2026, 8, 22, 23, 45)).getHours()).toBe(12);
  });

  it('לא מזיז את התאריך בהמרה חזרה', () => {
    expect(ymd(atNoon('2026-01-01'))).toBe('2026-01-01');
  });
});

describe('sundayOf', () => {
  it('מחזיר את יום ראשון שקדם לתאריך', () => {
    expect(sundayOf('2026-09-23')).toBe('2026-09-20'); // רביעי → ראשון
  });

  it('מחזיר את עצמו עבור יום ראשון', () => {
    expect(sundayOf('2026-09-20')).toBe('2026-09-20');
  });

  it('עובד גם עבור שבת, סוף השבוע', () => {
    expect(sundayOf('2026-09-26')).toBe('2026-09-20');
  });
});

describe('deliveryDayOf', () => {
  it('מחזיר את יום שלישי של אותו שבוע', () => {
    expect(deliveryDayOf('2026-09-23')).toBe('2026-09-22');
  });

  it('מחזיר את אותו יום חלוקה לכל ימי השבוע', () => {
    const week = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-26'];
    const ids = new Set(week.map((d) => deliveryDayOf(d)));
    expect([...ids]).toEqual(['2026-09-22']);
  });

  it('מכבד יום חלוקה אחר כשמבקשים אותו', () => {
    expect(deliveryDayOf('2026-09-23', 4)).toBe('2026-09-24'); // חמישי
    expect(deliveryDayOf('2026-09-23', 0)).toBe('2026-09-20'); // ראשון
  });

  it('ברירת המחדל היא יום שלישי', () => {
    expect(DELIVERY_WEEKDAY).toBe(2);
  });
});

describe('recentDeliveryDays', () => {
  it('מחזיר בדיוק את מספר הימים שהתבקש', () => {
    expect(recentDeliveryDays(7, '2026-09-23')).toHaveLength(7);
  });

  it('מתחיל ביום החלוקה של השבוע הנוכחי', () => {
    expect(recentDeliveryDays(3, '2026-09-23')[0]).toBe('2026-09-22');
  });

  it('יורד בשבוע שלם בכל צעד', () => {
    expect(recentDeliveryDays(3, '2026-09-23')).toEqual([
      '2026-09-22',
      '2026-09-15',
      '2026-09-08',
    ]);
  });

  it('חוצה גבול חודש בלי לדלג', () => {
    expect(recentDeliveryDays(2, '2026-10-06')).toEqual(['2026-10-06', '2026-09-29']);
  });
});

describe('dayLabel', () => {
  it('מציג את שם היום בעברית', () => {
    expect(dayLabel('2026-09-22')).toBe('יום שלישי, 22/9');
  });

  it('מזהה יום ראשון', () => {
    expect(dayLabel('2026-09-20')).toBe('יום ראשון, 20/9');
  });

  it('מחזיר את הקלט כמו שהוא אם אינו תאריך', () => {
    expect(dayLabel('לא-תאריך')).toBe('לא-תאריך');
  });
});

describe('dayShort', () => {
  it('מציג יום/חודש/שנה', () => {
    expect(dayShort('2026-09-22')).toBe('22/9/2026');
  });

  it('מחזיר את הקלט כמו שהוא אם אינו תאריך', () => {
    expect(dayShort('')).toBe('');
  });
});

describe('weekLabel', () => {
  it('מציג טווח של שבעה ימים', () => {
    expect(weekLabel('2026-09-20')).toBe('20/9–26/9');
  });

  it('מחזיר ריק עבור קלט ריק', () => {
    expect(weekLabel('')).toBe('');
  });
});

describe('telHref', () => {
  it('מנקה מקפים ורווחים', () => {
    expect(telHref('050-123 4567')).toBe('tel:0501234567');
  });

  it('שומר על קידומת בינלאומית', () => {
    expect(telHref('+972501234567')).toBe('tel:+972501234567');
  });

  it('מחזיר null כשאין מספר', () => {
    expect(telHref('')).toBeNull();
    expect(telHref('   ')).toBeNull();
  });
});

describe('whatsappHref', () => {
  it('ממיר מספר ישראלי מקומי לבינלאומי', () => {
    expect(whatsappHref('050-1234567')).toBe('https://wa.me/972501234567');
  });

  it('משאיר מספר שכבר בינלאומי', () => {
    expect(whatsappHref('972501234567')).toBe('https://wa.me/972501234567');
  });

  it('מחזיר null כשאין ספרות', () => {
    expect(whatsappHref('טלפון')).toBeNull();
  });
});

describe('navigationHref', () => {
  it('מקודד את הכתובת', () => {
    expect(navigationHref('הרצל 14')).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('הרצל 14')}&navigate=yes`,
    );
  });

  it('מחזיר null כשאין כתובת', () => {
    expect(navigationHref('  ')).toBeNull();
  });
});

describe('toCSV', () => {
  it('מחבר תאים בפסיקים ושורות ב-CRLF', () => {
    expect(toCSV([['א', 'ב'], ['ג', 'ד']])).toBe('א,ב\r\nג,ד');
  });

  it('עוטף במרכאות תא שמכיל פסיק', () => {
    expect(toCSV([['הרצל 14, דירה 3']])).toBe('"הרצל 14, דירה 3"');
  });

  it('מכפיל מרכאות בתוך תא', () => {
    expect(toCSV([['מתנ"ס']])).toBe('"מתנ""ס"');
  });

  it('מטפל בערכים ריקים', () => {
    expect(toCSV([[null, undefined, 0]])).toBe(',,0');
  });
});

describe('parsePastedRows', () => {
  it('מפרק הדבקה עם טאבים', () => {
    expect(parsePastedRows('101\tכהן\tהרצל 14')).toEqual([['101', 'כהן', 'הרצל 14']]);
  });

  it('מפרק הדבקה עם פסיקים', () => {
    expect(parsePastedRows('101,כהן')).toEqual([['101', 'כהן']]);
  });

  it('מסיר שורת כותרת', () => {
    expect(parsePastedRows('מס׳\tשם\n101\tכהן')).toEqual([['101', 'כהן']]);
  });

  it('מתעלם משורות ריקות', () => {
    expect(parsePastedRows('101,כהן\n\n  \n102,לוי')).toHaveLength(2);
  });

  it('מסיר מרכאות עוטפות', () => {
    expect(parsePastedRows('"101","כהן"')).toEqual([['101', 'כהן']]);
  });
});

describe('sortHe', () => {
  it('ממיין לפי אלפבית עברי', () => {
    expect(['תמר', 'אבי', 'משה'].sort(sortHe)).toEqual(['אבי', 'משה', 'תמר']);
  });

  it('מחזיר 0 לשמות זהים', () => {
    expect(sortHe('אבי', 'אבי')).toBe(0);
  });
});
