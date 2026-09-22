import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  DeliveryMark,
  DeliveryStatus,
  Driver,
  Family,
  Snapshot,
  Store,
  Week,
} from '../types';

/* ---- שורות כפי שהן בבסיס הנתונים (snake_case) ---- */
interface FamilyRow {
  id: string;
  num: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  phone2: string | null;
  source: string | null;
  join_date: string | null;
  end_date: string | null;
  notes: string | null;
  active: boolean | null;
  driver_id: string | null;
}
interface DriverRow {
  id: string;
  name: string;
  phone: string | null;
  capacity: number | null;
  notes: string | null;
  active: boolean | null;
}
interface WeekRow {
  id: string;
  status: Record<string, DeliveryMark> | null;
}

const toFamily = (r: FamilyRow): Family => ({
  id: r.id,
  num: r.num ?? '',
  name: r.name,
  address: r.address ?? '',
  phone: r.phone ?? '',
  phone2: r.phone2 ?? '',
  source: r.source ?? '',
  joinDate: r.join_date ?? '',
  endDate: r.end_date ?? '',
  notes: r.notes ?? '',
  active: r.active ?? true,
  driverId: r.driver_id ?? '',
});

const fromFamily = (f: Family): FamilyRow => ({
  id: f.id,
  num: f.num,
  name: f.name,
  address: f.address,
  phone: f.phone,
  phone2: f.phone2,
  source: f.source,
  join_date: f.joinDate || null,
  end_date: f.endDate || null,
  notes: f.notes,
  active: f.active,
  driver_id: f.driverId || null,
});

const toDriver = (r: DriverRow): Driver => ({
  id: r.id,
  name: r.name,
  phone: r.phone ?? '',
  capacity: r.capacity ?? 4,
  notes: r.notes ?? '',
  active: r.active ?? true,
});

const fromDriver = (d: Driver): DriverRow => ({
  id: d.id,
  name: d.name,
  phone: d.phone,
  capacity: d.capacity,
  notes: d.notes,
  active: d.active,
});

const toWeek = (r: WeekRow): Week => ({ id: r.id, status: r.status ?? {} });

/**
 * אחסון משותף. כל שינוי של מתנדב אחד מגיע לכל השאר דרך Supabase Realtime.
 * סימון מסירה עובר דרך פונקציית SQL שממזגת שדה בודד ב-jsonb, כדי ששני
 * מובילים שמסמנים באותו רגע לא ידרסו זה את סימונו של זה.
 */
export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  private async fetchAll(): Promise<Snapshot> {
    const [families, drivers, weeks] = await Promise.all([
      this.client.from('families').select('*'),
      this.client.from('drivers').select('*'),
      this.client.from('weeks').select('*'),
    ]);
    if (families.error) throw families.error;
    if (drivers.error) throw drivers.error;
    if (weeks.error) throw weeks.error;
    return {
      families: ((families.data ?? []) as FamilyRow[]).map(toFamily),
      drivers: ((drivers.data ?? []) as DriverRow[]).map(toDriver),
      weeks: ((weeks.data ?? []) as WeekRow[]).map(toWeek),
    };
  }

  subscribe(onChange: (snap: Snapshot) => void): () => void {
    let cancelled = false;

    const refresh = () => {
      this.fetchAll()
        .then((snap) => {
          if (!cancelled) onChange(snap);
        })
        .catch((err) => console.error('[gemach] טעינת נתונים נכשלה', err));
    };

    refresh();

    const channel = this.client
      .channel('gemach-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weeks' }, refresh)
      .subscribe();

    // רשת ביטחון אם חיבור ה-realtime נופל
    const poll = window.setInterval(refresh, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void this.client.removeChannel(channel);
    };
  }

  async saveFamily(family: Family): Promise<void> {
    const { error } = await this.client.from('families').upsert(fromFamily(family));
    if (error) throw error;
  }

  async deleteFamily(id: string): Promise<void> {
    const { error } = await this.client.from('families').delete().eq('id', id);
    if (error) throw error;
  }

  async saveDriver(driver: Driver): Promise<void> {
    const { error } = await this.client.from('drivers').upsert(fromDriver(driver));
    if (error) throw error;
  }

  async deleteDriver(id: string): Promise<void> {
    await this.client.from('families').update({ driver_id: null }).eq('driver_id', id);
    const { error } = await this.client.from('drivers').delete().eq('id', id);
    if (error) throw error;
  }

  async setDeliveryStatus(
    weekId: string,
    familyId: string,
    status: DeliveryStatus,
  ): Promise<void> {
    const mark: DeliveryMark = { s: status, t: new Date().toISOString() };
    const { error } = await this.client.rpc('set_delivery', {
      p_week_id: weekId,
      p_family_id: familyId,
      p_mark: mark,
    });
    if (error) throw error;
  }

  async importFamilies(families: Family[]): Promise<void> {
    if (!families.length) return;
    const { error } = await this.client.from('families').insert(families.map(fromFamily));
    if (error) throw error;
  }
}
