import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Delivery,
  DeliveryDay,
  DeliveryStatus,
  DayStatus,
  Driver,
  Family,
  Snapshot,
  Store,
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
  household_size: number | null;
  active: boolean | null;
  driver_id: string | null;
}
interface DriverRow {
  id: string;
  name: string;
  phone: string | null;
  capacity: number | null;
  area: string | null;
  join_date: string | null;
  notes: string | null;
  active: boolean | null;
}
interface DayRow {
  id: string;
  week_id: string | null;
  status: DayStatus | null;
  notes: string | null;
  boxes_packed: number | null;
  created_at: string | null;
}
interface DeliveryRow {
  id: string;
  day_id: string;
  family_id: string;
  family_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  status: DeliveryStatus | null;
  marked_at: string | null;
  notes: string | null;
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
  householdSize: r.household_size ?? 0,
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
  household_size: f.householdSize,
  active: f.active,
  driver_id: f.driverId || null,
});

const toDriver = (r: DriverRow): Driver => ({
  id: r.id,
  name: r.name,
  phone: r.phone ?? '',
  capacity: r.capacity ?? 4,
  area: r.area ?? '',
  joinDate: r.join_date ?? '',
  notes: r.notes ?? '',
  active: r.active ?? true,
});

const fromDriver = (d: Driver): DriverRow => ({
  id: d.id,
  name: d.name,
  phone: d.phone,
  capacity: d.capacity,
  area: d.area,
  join_date: d.joinDate || null,
  notes: d.notes,
  active: d.active,
});

const toDay = (r: DayRow): DeliveryDay => ({
  id: r.id,
  weekId: r.week_id ?? '',
  status: r.status ?? 'closed',
  notes: r.notes ?? '',
  boxesPacked: r.boxes_packed ?? 0,
  createdAt: r.created_at ?? '',
});

const fromDay = (d: DeliveryDay): DayRow => ({
  id: d.id,
  week_id: d.weekId,
  status: d.status,
  notes: d.notes,
  boxes_packed: d.boxesPacked,
  created_at: d.createdAt || null,
});

const toDelivery = (r: DeliveryRow): Delivery => ({
  id: r.id,
  dayId: r.day_id,
  familyId: r.family_id,
  familyName: r.family_name ?? '',
  driverId: r.driver_id ?? '',
  driverName: r.driver_name ?? '',
  status: r.status ?? '',
  markedAt: r.marked_at ?? '',
  notes: r.notes ?? '',
});

const fromDelivery = (d: Delivery): DeliveryRow => ({
  id: d.id,
  day_id: d.dayId,
  family_id: d.familyId,
  family_name: d.familyName,
  driver_id: d.driverId || null,
  driver_name: d.driverName,
  status: d.status,
  marked_at: d.markedAt || null,
  notes: d.notes,
});

/**
 * אחסון משותף. כל שינוי של מתנדב אחד מגיע לכל השאר דרך Supabase Realtime.
 *
 * סימון מסירה הוא upsert רגיל על שורה אחת, כי לכל משפחה בכל יום יש שורה
 * נפרדת משלה. בגרסה הקודמת כל השבוע היה אובייקט jsonb יחיד, ולכן שני מובילים
 * שסימנו באותו רגע היו דורסים זה את סימונו של זה — וזה חייב פונקציית מיזוג
 * ב-SQL. המבנה הנוכחי פותר את זה מעצם היותו מנורמל.
 */
export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  private async fetchAll(): Promise<Snapshot> {
    const [families, drivers, days, deliveries] = await Promise.all([
      this.client.from('families').select('*'),
      this.client.from('drivers').select('*'),
      this.client.from('delivery_days').select('*'),
      this.client.from('deliveries').select('*'),
    ]);
    if (families.error) throw families.error;
    if (drivers.error) throw drivers.error;
    if (days.error) throw days.error;
    if (deliveries.error) throw deliveries.error;
    return {
      families: ((families.data ?? []) as FamilyRow[]).map(toFamily),
      drivers: ((drivers.data ?? []) as DriverRow[]).map(toDriver),
      days: ((days.data ?? []) as DayRow[]).map(toDay),
      deliveries: ((deliveries.data ?? []) as DeliveryRow[]).map(toDelivery),
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_days' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, refresh)
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

  async saveDeliveryDay(day: DeliveryDay): Promise<void> {
    const { error } = await this.client.from('delivery_days').upsert(fromDay(day));
    if (error) throw error;
  }

  async openDeliveryDay(day: DeliveryDay, planned: Delivery[]): Promise<void> {
    const dayResult = await this.client
      .from('delivery_days')
      .upsert(fromDay(day), { onConflict: 'id', ignoreDuplicates: true });
    if (dayResult.error) throw dayResult.error;
    if (!planned.length) return;

    // ignoreDuplicates: מוביל שכבר סימן מסירה לא יאבד אותה אם רכז פותח את היום שוב.
    const { error } = await this.client
      .from('deliveries')
      .upsert(planned.map(fromDelivery), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  async setDeliveryStatus(delivery: Delivery): Promise<void> {
    const { error } = await this.client.from('deliveries').upsert(fromDelivery(delivery));
    if (error) throw error;
  }

  async importFamilies(families: Family[]): Promise<void> {
    if (!families.length) return;
    const { error } = await this.client.from('families').insert(families.map(fromFamily));
    if (error) throw error;
  }

  async seed(snapshot: Snapshot): Promise<void> {
    const skipExisting = { onConflict: 'id', ignoreDuplicates: true } as const;
    const steps = [
      this.client.from('drivers').upsert(snapshot.drivers.map(fromDriver), skipExisting),
      this.client.from('families').upsert(snapshot.families.map(fromFamily), skipExisting),
      this.client.from('delivery_days').upsert(snapshot.days.map(fromDay), skipExisting),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw error;
    }
    // אחרון, כי הוא מפנה לכל השאר במפתחות זרים.
    const { error } = await this.client
      .from('deliveries')
      .upsert(snapshot.deliveries.map(fromDelivery), skipExisting);
    if (error) throw error;
  }
}
