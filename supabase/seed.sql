-- ============================================================
--  גמ"ח מזון — נתוני פתיחה
--  10 מתנדבים מובילים · 10 משפחות · 7 ימי חלוקה שבועיים אחורה.
--
--  הריצו אחרי schema.sql. המזהים קבועים ('vol-01', 'fam-01', …) וכל
--  ההוספות הן ON CONFLICT DO NOTHING, ולכן הרצה חוזרת לא משכפלת נתונים
--  ולא דורסת עריכות שעשיתם.
--
--  אותם מזהים בדיוק נמצאים ב-src/lib/seed.ts, שטוען את אותם נתונים
--  לאחסון המקומי. כך שתי הדרכים לא מתנגשות זו בזו.
-- ============================================================

-- ------------------------------------------------------------
--  מתנדבים מובילים
-- ------------------------------------------------------------
insert into public.drivers (id, name, phone, capacity, area, join_date, notes, active) values
  ('vol-01', 'אבי מזרחי',    '050-1110001', 4, 'מרכז', '2024-01-14', 'רכב מסחרי גדול', true),
  ('vol-02', 'רבקה לוי',     '052-1110002', 3, 'צפון', '2024-02-04', '',                true),
  ('vol-03', 'משה פרידמן',   '053-1110003', 4, 'דרום', '2024-03-10', 'זמין רק בערב',    true),
  ('vol-04', 'שרה בן-דוד',   '054-1110004', 5, 'מרכז', '2024-04-21', '',                true),
  ('vol-05', 'יוסף אזולאי',  '050-1110005', 3, 'מזרח', '2024-06-02', '',                true),
  ('vol-06', 'חנה שטרן',     '058-1110006', 4, 'צפון', '2024-07-15', 'מגיעה עם הבן',    true),
  ('vol-07', 'דוד אוחיון',   '052-1110007', 2, 'מערב', '2024-09-08', '',                true),
  ('vol-08', 'מרים גולדברג', '054-1110008', 4, 'מרכז', '2025-01-05', 'מחליפה בחופשות',  true),
  ('vol-09', 'אליהו נחום',   '053-1110009', 3, 'דרום', '2025-02-18', '',                true),
  ('vol-10', 'תמר הלוי',     '058-1110010', 5, 'מזרח', '2025-05-11', 'רכזת גיבוי',      true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  משפחות מקבלות
-- ------------------------------------------------------------
insert into public.families
  (id, num, name, address, phone, phone2, source, join_date, end_date, notes, household_size, active, driver_id) values
  ('fam-01', '101', 'משפחת כהן',     'הרצל 14, דירה 3',  '050-2220001', '',            'רווחה',      '2024-02-01', null, 'ללא גלוטן לילד הקטן',      5, true, 'vol-01'),
  ('fam-02', '102', 'משפחת ביטון',   'ויצמן 8',          '052-2220002', '050-2220012', 'בית הכנסת',  '2024-02-01', null, '',                          7, true, 'vol-01'),
  ('fam-03', '103', 'משפחת אברהם',   'סוקולוב 22, קומה 2','053-2220003', '',           'רווחה',      '2024-03-12', null, 'אין מעלית',                 3, true, 'vol-02'),
  ('fam-04', '104', 'משפחת דהן',     'בן גוריון 41',     '054-2220004', '',            'שכנה',       '2024-04-02', null, '',                          4, true, 'vol-02'),
  ('fam-05', '105', 'משפחת שמעוני',  'האלון 5',          '050-2220005', '',            'רווחה',      '2024-05-20', null, 'להתקשר לפני הגעה',          6, true, 'vol-03'),
  ('fam-06', '106', 'משפחת נסים',    'הזית 17, דירה 8',  '058-2220006', '',            'בית הכנסת',  '2024-08-11', null, '',                          2, true, 'vol-04'),
  ('fam-07', '107', 'משפחת אלמליח',  'הגפן 3',           '052-2220007', '054-2220017', 'רווחה',      '2024-10-06', null, 'אם חד-הורית',               4, true, 'vol-04'),
  ('fam-08', '108', 'משפחת רוזן',    'התאנה 29',         '053-2220008', '',            'מתנ"ס',      '2025-01-19', null, '',                          8, true, 'vol-05'),
  ('fam-09', '109', 'משפחת עמר',     'הרימון 11, קומה 4','050-2220009', '',            'רווחה',      '2025-03-02', null, 'עברה למוביל אחר ביוני',     5, true, 'vol-06'),
  ('fam-10', '110', 'משפחת טולדנו',  'הדקל 6',           '054-2220010', '',            'שכן',        '2025-06-15', null, '',                          3, true, 'vol-07')
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  ימי חלוקה — יום שלישי בכל שבוע, שבעה שבועות אחורה
-- ------------------------------------------------------------
with weeks as (
  -- יום ראשון של השבוע הנוכחי, ועוד 2 ימים = יום שלישי
  select ((current_date - extract(dow from current_date)::int + 2) - (n * 7))::date as day_date,
         n as weeks_back
  from generate_series(0, 6) as n
)
insert into public.delivery_days (id, week_id, status, notes, boxes_packed)
select
  to_char(w.day_date, 'YYYY-MM-DD'),
  to_char(w.day_date - extract(dow from w.day_date)::int, 'YYYY-MM-DD'),
  case when w.weeks_back = 0 then 'active' else 'closed' end,
  case when w.weeks_back = 0 then 'אריזה ב-15:00 במחסן' else '' end,
  10
from weeks w
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  מסירות — משפחה אחת בכל יום חלוקה
--
--  שימו לב ל-driver_id: עד לפני ארבעה שבועות משפחת עמר ('fam-09') הייתה
--  אצל 'vol-03', ורק אז עברה ל-'vol-06'. הימים הישנים ממשיכים להראות את
--  המוביל שבאמת חילק להם — וזו בדיוק הסיבה שהטבלה הזו קיימת.
-- ------------------------------------------------------------
with weeks as (
  select ((current_date - extract(dow from current_date)::int + 2) - (n * 7))::date as day_date,
         n as weeks_back
  from generate_series(0, 6) as n
),
plan as (
  select
    to_char(w.day_date, 'YYYY-MM-DD')                      as day_id,
    w.weeks_back,
    f.id                                                   as family_id,
    f.name                                                 as family_name,
    case
      when w.weeks_back > 3 and f.id = 'fam-09' then 'vol-03'
      else f.driver_id
    end                                                    as driver_id,
    row_number() over (partition by w.weeks_back order by f.id) as seat
  from weeks w
    cross join public.families f
  where f.id like 'fam-%'
)
insert into public.deliveries
  (id, day_id, family_id, family_name, driver_id, driver_name, status, marked_at)
select
  p.day_id || ':' || p.family_id,
  p.day_id,
  p.family_id,
  p.family_name,
  p.driver_id,
  v.name,
  s.status,
  case when s.status = '' then null
       else (p.day_id || ' 16:00')::timestamptz end
from plan p
  left join public.drivers v on v.id = p.driver_id
  cross join lateral (
    select case
      -- השבוע הנוכחי באמצע העבודה: חצי מהמסלולים כבר חזרו
      when p.weeks_back = 0 and p.seat <= 5 then 'delivered'
      when p.weeks_back = 0                 then ''
      -- בעבר כמעט הכול נמסר, ומדי פעם מישהו לא היה בבית
      when mod((('x' || substr(md5(p.family_id || '|' || p.day_id), 1, 8))::bit(32)::int)::bigint, 11) = 0
        then 'absent'
      else 'delivered'
    end as status
  ) s
on conflict (id) do nothing;
