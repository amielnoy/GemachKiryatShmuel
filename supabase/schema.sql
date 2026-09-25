-- ============================================================
--  גמ"ח מזון — סכמת בסיס הנתונים (v2)
--  הדביקו את כל הקובץ ב-Supabase → SQL Editor → Run.
--  הקובץ בטוח להרצה חוזרת: הוא לא מוחק נתונים קיימים.
--
--  מה השתנה מ-v1: יום החלוקה קיבל טבלה משלו, ולכל מסירה יש שורה נפרדת
--  שמתעדת מי הוביל ומי קיבל. קודם כל השבוע היה אובייקט jsonb אחד שידע רק
--  אילו משפחות קיבלו — ולא מי הביא להן, כך שהחלפת מוביל שכתבה את העבר.
--  סעיף המיגרציה בתחתית הקובץ מעביר נתוני v1 קיימים למבנה החדש.
-- ============================================================

-- ------------------------------------------------------------
--  משפחות מקבלות
-- ------------------------------------------------------------
create table if not exists public.families (
  id             text primary key,
  num            text,
  name           text not null,
  address        text,
  phone          text,
  phone2         text,
  source         text,          -- הגורם שהפנה את המשפחה
  join_date      text,
  end_date       text,
  notes          text,
  household_size integer not null default 0,   -- נפשות בבית, קובע גודל חבילה
  active         boolean not null default true,
  driver_id      text,          -- המוביל המשובץ כרגע (לא היסטוריה)
  updated_at     timestamptz not null default now()
);

-- שדות שנוספו ב-v2, למי שכבר הריץ את v1
alter table public.families add column if not exists household_size integer not null default 0;

-- ------------------------------------------------------------
--  מתנדבים מובילים
-- ------------------------------------------------------------
create table if not exists public.drivers (
  id          text primary key,
  name        text not null,
  phone       text,
  capacity    integer not null default 4,   -- כמה חבילות בשבוע
  area        text,                          -- אזור החלוקה שלו
  join_date   text,
  notes       text,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.drivers add column if not exists area      text;
alter table public.drivers add column if not exists join_date text;

-- ------------------------------------------------------------
--  ימי חלוקה
--  המזהה הוא תאריך יום החלוקה עצמו, למשל '2026-09-22'.
-- ------------------------------------------------------------
create table if not exists public.delivery_days (
  id            text primary key,
  week_id       text,                                   -- יום ראשון של אותו שבוע
  status        text not null default 'planned'
                check (status in ('planned', 'active', 'closed')),
  notes         text,
  boxes_packed  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
--  מסירות — שורה אחת לכל משפחה בכל יום חלוקה
--
--  זו טבלת התיעוד של הגמ"ח, והיא נכתבת פעם אחת ונשארת. שימו לב לשלוש
--  החלטות מכוונות:
--
--  1. driver_id נשמר כאן ולא נקרא מ-families. המוביל של משפחה משתנה מדי
--     כמה חודשים; מי שחילק ב-12/5 לא משתנה לעולם.
--  2. family_name ו-driver_name נשמרים כטקסט. אם משפחה נמחקת מהרשימה,
--     העובדה שהיא קיבלה חבילה ב-12/5 עדיין קריאה בדוחות.
--  3. אין מפתחות זרים ל-families ול-drivers, בדיוק מאותה סיבה: מחיקת
--     רשומה מהרשימה הפעילה לא אמורה למחוק או לחסום את ההיסטוריה.
-- ------------------------------------------------------------
create table if not exists public.deliveries (
  id           text primary key,              -- '<day_id>:<family_id>'
  day_id       text not null references public.delivery_days (id) on delete cascade,
  family_id    text not null,
  family_name  text,
  driver_id    text,
  driver_name  text,
  status       text not null default ''
               check (status in ('delivered', 'absent', '')),
  marked_at    timestamptz,
  notes        text,
  updated_at   timestamptz not null default now(),
  unique (day_id, family_id)
);

create index if not exists families_driver_idx     on public.families (driver_id);
create index if not exists deliveries_day_idx      on public.deliveries (day_id);
create index if not exists deliveries_family_idx   on public.deliveries (family_id);
create index if not exists deliveries_driver_idx   on public.deliveries (driver_id);
create index if not exists delivery_days_week_idx  on public.delivery_days (week_id);

-- ------------------------------------------------------------
--  תצוגה נוחה לדוחות: כל מסירה עם פרטי המשפחה הנוכחיים לצד המתועדים
-- ------------------------------------------------------------
create or replace view public.delivery_log as
select
  d.day_id,
  dd.week_id,
  d.family_id,
  coalesce(f.name, d.family_name)  as family_name,
  f.address,
  f.household_size,
  d.driver_id,
  coalesce(v.name, d.driver_name)  as driver_name,
  d.status,
  d.marked_at
from public.deliveries d
  left join public.delivery_days dd on dd.id = d.day_id
  left join public.families      f  on f.id  = d.family_id
  left join public.drivers       v  on v.id  = d.driver_id;

-- ------------------------------------------------------------
--  RLS
--  ההגדרה כאן פותחת קריאה וכתיבה למפתח ה-anon, כלומר לכל מי שיש לו
--  את הקישור לאפליקציה. זה מתאים לגמ"ח שכונתי עם קישור פרטי, אבל זו
--  אינה אבטחה אמיתית. להקשחה ראו את הסעיף "אבטחה" ב-README.
-- ------------------------------------------------------------
alter table public.families      enable row level security;
alter table public.drivers       enable row level security;
alter table public.delivery_days enable row level security;
alter table public.deliveries    enable row level security;

drop policy if exists families_all      on public.families;
drop policy if exists drivers_all       on public.drivers;
drop policy if exists delivery_days_all on public.delivery_days;
drop policy if exists deliveries_all    on public.deliveries;

create policy families_all      on public.families      for all to anon, authenticated using (true) with check (true);
create policy drivers_all       on public.drivers       for all to anon, authenticated using (true) with check (true);
create policy delivery_days_all on public.delivery_days for all to anon, authenticated using (true) with check (true);
create policy deliveries_all    on public.deliveries    for all to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------
--  Realtime — בלי זה שינוי של מתנדב אחד לא יופיע אצל השאר עד לרענון
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.families;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.drivers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.delivery_days;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.deliveries;
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
--  מיגרציה מ-v1 (טבלת weeks עם jsonb)
--  רצה רק אם הטבלה הישנה קיימת. המוביל שנרשם הוא המוביל הנוכחי של
--  המשפחה — זו ההשערה הטובה ביותר, כי v1 פשוט לא שמר את המידע הזה.
--  הטבלה הישנה נשארת במקומה כגיבוי; אפשר למחוק אותה ידנית אחר כך.
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'weeks') then

    insert into public.delivery_days (id, week_id, status, notes, boxes_packed)
    select w.id, w.id, 'closed', 'יובא מגרסה קודמת', 0
    from public.weeks w
    on conflict (id) do nothing;

    insert into public.deliveries
      (id, day_id, family_id, family_name, driver_id, driver_name, status, marked_at)
    select
      w.id || ':' || e.key,
      w.id,
      e.key,
      f.name,
      f.driver_id,
      v.name,
      coalesce(e.value ->> 's', ''),
      nullif(e.value ->> 't', '')::timestamptz
    from public.weeks w
      cross join lateral jsonb_each(w.status) as e(key, value)
      left join public.families f on f.id = e.key
      left join public.drivers  v on v.id = f.driver_id
    where coalesce(e.value ->> 's', '') in ('delivered', 'absent', '')
    on conflict (id) do nothing;

    raise notice 'הועברו נתוני v1 מטבלת weeks. אפשר למחוק אותה עם: drop table public.weeks;';
  end if;
end $$;
