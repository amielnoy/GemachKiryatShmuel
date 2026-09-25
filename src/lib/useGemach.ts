import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Delivery,
  DeliveryStatus,
  Driver,
  Family,
  Snapshot,
  Store,
} from '../types';
import { EMPTY_SNAPSHOT, deliveryId } from '../types';
import {
  buildDayBoard,
  makeDeliveryDay,
  planFor,
  summarizeDays,
  type DayBoard,
  type DaySummary,
} from './dayBoard';
import { buildSeed } from './seed';
import { deliveryDayOf, sortHe, sundayOf, uid } from './utils';

export interface Gemach {
  store: Store;
  loading: boolean;
  snap: Snapshot;
  /** תאריך יום החלוקה של השבוע הנוכחי, YYYY-MM-DD. */
  todayId: string;
  weekId: string;
  families: Family[];
  activeFamilies: Family[];
  activeDrivers: Driver[];
  /** מזהה מוביל → המשפחות המשובצות אליו, ממוינות בעברית. */
  byDriver: Record<string, Family[]>;
  unassigned: Family[];
  status: Record<string, DeliveryStatus>;
  deliveredCount: number;
  /** כל ימי החלוקה שנרשמו, מהחדש לישן, עם סיכום. */
  daySummaries: DaySummary[];
  selectedDayId: string;
  selectDay: (dayId: string) => void;
  /** הלוח של היום הנבחר: מי מוביל, למי, ומה הסטטוס. */
  board: DayBoard;
  /** האם יום החלוקה של השבוע כבר נפתח ונשמר. */
  todayOpened: boolean;
  openToday: () => Promise<number>;
  saveFamily: (family: Family) => Promise<void>;
  deleteFamily: (id: string) => Promise<void>;
  saveDriver: (driver: Driver) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  assign: (familyId: string, driverId: string) => Promise<void>;
  setStatus: (familyId: string, next: DeliveryStatus) => Promise<void>;
  autoAssign: () => Promise<number>;
  importFamilies: (rows: string[][]) => Promise<number>;
  loadDemoData: () => Promise<void>;
}

export function useGemach(store: Store): Gemach {
  const [snap, setSnap] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const todayId = useMemo(() => deliveryDayOf(new Date()), []);

  useEffect(() => {
    const unsubscribe = store.subscribe((next) => {
      setSnap(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [store]);

  const activeFamilies = useMemo(
    () => snap.families.filter((f) => f.active).sort((a, b) => sortHe(a.name, b.name)),
    [snap.families],
  );
  const activeDrivers = useMemo(
    () => snap.drivers.filter((d) => d.active).sort((a, b) => sortHe(a.name, b.name)),
    [snap.drivers],
  );

  const byDriver = useMemo(() => {
    const map: Record<string, Family[]> = {};
    activeDrivers.forEach((d) => { map[d.id] = []; });
    activeFamilies.forEach((f) => { map[f.driverId]?.push(f); });
    return map;
  }, [activeDrivers, activeFamilies]);

  const unassigned = useMemo(
    () => activeFamilies.filter((f) => !f.driverId || !byDriver[f.driverId]),
    [activeFamilies, byDriver],
  );

  const daySummaries = useMemo(() => summarizeDays(snap), [snap]);
  const todayOpened = useMemo(() => snap.days.some((d) => d.id === todayId), [snap.days, todayId]);

  // ברירת המחדל היא תמיד היום הנוכחי, אלא אם הרכז בחר לצפות ביום אחר.
  const selectedDayId = pickedDay ?? todayId;
  const board = useMemo(() => buildDayBoard(snap, selectedDayId), [snap, selectedDayId]);

  const status = useMemo(() => {
    const out: Record<string, DeliveryStatus> = {};
    for (const d of snap.deliveries) {
      if (d.dayId === todayId) out[d.familyId] = d.status;
    }
    return out;
  }, [snap.deliveries, todayId]);

  const deliveredCount = useMemo(
    () => activeFamilies.filter((f) => status[f.id] === 'delivered').length,
    [activeFamilies, status],
  );

  const saveFamily = useCallback(
    (family: Family) => store.saveFamily({ ...family, id: family.id || uid() }),
    [store],
  );
  const deleteFamily = useCallback((id: string) => store.deleteFamily(id), [store]);
  const saveDriver = useCallback(
    (driver: Driver) => store.saveDriver({ ...driver, id: driver.id || uid() }),
    [store],
  );
  const deleteDriver = useCallback((id: string) => store.deleteDriver(id), [store]);

  const assign = useCallback(
    async (familyId: string, driverId: string) => {
      const family = snap.families.find((f) => f.id === familyId);
      if (family) await store.saveFamily({ ...family, driverId });
    },
    [snap.families, store],
  );

  /** פותח את יום החלוקה של השבוע ושומר את התוכנית. מחזיר כמה שורות נוספו. */
  const openToday = useCallback(async () => {
    const planned = planFor(todayId, snap.families, snap.drivers);
    const already = new Set(
      snap.deliveries.filter((d) => d.dayId === todayId).map((d) => d.id),
    );
    await store.openDeliveryDay(
      makeDeliveryDay(todayId, planned.length),
      planned,
    );
    return planned.filter((p) => !already.has(p.id)).length;
  }, [snap.families, snap.drivers, snap.deliveries, store, todayId]);

  /**
   * מסמן מסירה ליום הנוכחי. אם עוד אין שורה למשפחה הזו, היא נוצרת כאן —
   * כולל צילום של המוביל והשמות ברגע הסימון, כדי שהתיעוד יהיה שלם גם אם
   * הרכז לא פתח את היום מראש.
   */
  const setStatus = useCallback(
    async (familyId: string, next: DeliveryStatus) => {
      if (!snap.days.some((d) => d.id === todayId)) {
        await store.openDeliveryDay(makeDeliveryDay(todayId), []);
      }

      const existing = snap.deliveries.find((d) => d.id === deliveryId(todayId, familyId));
      const family = snap.families.find((f) => f.id === familyId);
      const driverId = existing?.driverId || family?.driverId || '';
      const driverName =
        existing?.driverName || snap.drivers.find((d) => d.id === driverId)?.name || '';

      const delivery: Delivery = {
        id: deliveryId(todayId, familyId),
        dayId: todayId,
        familyId,
        familyName: existing?.familyName || family?.name || '',
        driverId,
        driverName,
        status: next,
        markedAt: next ? new Date().toISOString() : '',
        notes: existing?.notes ?? '',
      };
      await store.setDeliveryStatus(delivery);
    },
    [snap.days, snap.deliveries, snap.families, snap.drivers, store, todayId],
  );

  /** מחלק את הממתינות למוביל הפנוי ביותר, עד לתקרה של כל מוביל. */
  const autoAssign = useCallback(async () => {
    const load: Record<string, number> = {};
    activeDrivers.forEach((d) => { load[d.id] = byDriver[d.id]?.length ?? 0; });

    let placed = 0;
    for (const family of unassigned) {
      const candidate = activeDrivers
        .filter((d) => (load[d.id] ?? 0) < d.capacity)
        .sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0];
      if (!candidate) break;
      load[candidate.id] = (load[candidate.id] ?? 0) + 1;
      placed += 1;
      await store.saveFamily({ ...family, driverId: candidate.id });
    }
    return placed;
  }, [activeDrivers, byDriver, unassigned, store]);

  /** עמודות הגיליון: מס׳ · שם · כתובת · טלפון · טלפון II · מקור · הצטרפות · הסרה · נפשות */
  const importFamilies = useCallback(
    async (rows: string[][]) => {
      const parsed: Family[] = [];
      for (const cells of rows) {
        const name = (cells[1] ?? '').trim() || (cells[0] ?? '').trim();
        if (!name) continue;
        const endDate = (cells[7] ?? '').trim();
        parsed.push({
          id: uid(),
          num: (cells[0] ?? '').trim(),
          name,
          address: (cells[2] ?? '').trim(),
          phone: (cells[3] ?? '').trim(),
          phone2: (cells[4] ?? '').trim(),
          source: (cells[5] ?? '').trim(),
          joinDate: (cells[6] ?? '').trim(),
          endDate,
          notes: '',
          householdSize: Number((cells[8] ?? '').trim()) || 0,
          active: !endDate,
          driverId: '',
        });
      }
      await store.importFamilies(parsed);
      return parsed.length;
    },
    [store],
  );

  const loadDemoData = useCallback(() => store.seed(buildSeed()), [store]);

  return {
    store, loading, snap, todayId,
    weekId: sundayOf(todayId),
    families: snap.families,
    activeFamilies, activeDrivers, byDriver, unassigned,
    status, deliveredCount,
    daySummaries, selectedDayId, selectDay: setPickedDay, board, todayOpened, openToday,
    saveFamily, deleteFamily, saveDriver, deleteDriver,
    assign, setStatus, autoAssign, importFamilies, loadDemoData,
  };
}
