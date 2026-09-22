-- ============================================================
--  גמ"ח מזון — סכמת בסיס הנתונים
--  הדביקו את כל הקובץ ב-Supabase → SQL Editor → Run
-- ============================================================

create table if not exists public.families (
  id          text primary key,
  num         text,
  name        text not null,
  address     text,
  phone       text,
  phone2      text,
  source      text,
  join_date   text,
  end_date    text,
  notes       text,
  active      boolean not null default true,
  driver_id   text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.drivers (
  id          text primary key,
  name        text not null,
  phone       text,
  capacity    integer not null default 4,
  notes       text,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- מזהה השבוע הוא תאריך יום ראשון, למשל '2026-09-20'.
-- status הוא מפה: מזהה משפחה → {"s": "delivered", "t": "<ISO>"}
create table if not exists public.weeks (
  id          text primary key,
  status      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create index if not exists families_driver_idx on public.families (driver_id);

-- ------------------------------------------------------------
--  סימון מסירה
--  ממזג שדה בודד בתוך ה-jsonb, כך ששני מובילים שמסמנים באותו רגע
--  לא דורסים זה את סימונו של זה (upsert רגיל היה מאבד עדכונים).
-- ------------------------------------------------------------
create or replace function public.set_delivery(
  p_week_id   text,
  p_family_id text,
  p_mark      jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.weeks (id, status)
  values (p_week_id, jsonb_build_object(p_family_id, p_mark))
  on conflict (id) do update
    set status     = public.weeks.status || jsonb_build_object(p_family_id, p_mark),
        updated_at = now();
end;
$$;

-- ------------------------------------------------------------
--  RLS
--  ההגדרה כאן פותחת קריאה וכתיבה למפתח ה-anon, כלומר לכל מי שיש לו
--  את הקישור לאפליקציה. זה מתאים לגמ"ח שכונתי עם קישור פרטי, אבל זו
--  אינה אבטחה אמיתית. להקשחה ראו את הסעיף "אבטחה" ב-README.
-- ------------------------------------------------------------
alter table public.families enable row level security;
alter table public.drivers  enable row level security;
alter table public.weeks    enable row level security;

drop policy if exists families_all on public.families;
drop policy if exists drivers_all  on public.drivers;
drop policy if exists weeks_all    on public.weeks;

create policy families_all on public.families for all to anon, authenticated using (true) with check (true);
create policy drivers_all  on public.drivers  for all to anon, authenticated using (true) with check (true);
create policy weeks_all    on public.weeks    for all to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------
--  Realtime — בלי זה שינוי של מתנדב אחד לא יופיע אצל השאר עד לרענון
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.families;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.weeks;
