import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DeliveryStatus, Driver, Family, Snapshot, Store } from '../types';
import { EMPTY_SNAPSHOT } from '../types';
import { sortHe, sundayOf, uid } from './utils';

export interface Gemach {
  store: Store;
  loading: boolean;
  weekId: string;
  families: Family[];
  activeFamilies: Family[];
  activeDrivers: Driver[];
  /** מזהה מוביל → המשפחות המשובצות אליו, ממוינות בעברית. */
  byDriver: Record<string, Family[]>;
  unassigned: Family[];
  status: Record<string, DeliveryStatus>;
  deliveredCount: number;
  saveFamily: (family: Family) => Promise<void>;
  deleteFamily: (id: string) => Promise<void>;
  saveDriver: (driver: Driver) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  assign: (familyId: string, driverId: string) => Promise<void>;
  setStatus: (familyId: string, next: DeliveryStatus) => Promise<void>;
  autoAssign: () => Promise<number>;
  importFamilies: (rows: string[][]) => Promise<number>;
}

export function useGemach(store: Store): Gemach {
  const [snap, setSnap] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const weekId = useMemo(() => sundayOf(new Date()), []);

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

  const status = useMemo(() => {
    const week = snap.weeks.find((w) => w.id === weekId);
    const out: Record<string, DeliveryStatus> = {};
    if (week) {
      for (const [familyId, mark] of Object.entries(week.status)) out[familyId] = mark.s;
    }
    return out;
  }, [snap.weeks, weekId]);

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

  const setStatus = useCallback(
    (familyId: string, next: DeliveryStatus) =>
      store.setDeliveryStatus(weekId, familyId, next),
    [store, weekId],
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

  /** עמודות הגיליון: מס׳ · שם · כתובת · טלפון · טלפון II · מקור · הצטרפות · הסרה */
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
          active: !endDate,
          driverId: '',
        });
      }
      await store.importFamilies(parsed);
      return parsed.length;
    },
    [store],
  );

  return {
    store, loading, weekId,
    families: snap.families,
    activeFamilies, activeDrivers, byDriver, unassigned,
    status, deliveredCount,
    saveFamily, deleteFamily, saveDriver, deleteDriver,
    assign, setStatus, autoAssign, importFamilies,
  };
}
