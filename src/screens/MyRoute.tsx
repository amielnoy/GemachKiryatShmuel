import type { Driver } from '../types';
import type { Gemach } from '../lib/useGemach';
import { DeliveryRow } from '../components/DeliveryRow';
import { EmptyState, Icon, ProgressCard } from '../components/ui';

export function PickMe({ drivers, onPick }: { drivers: Driver[]; onPick: (id: string) => void }) {
  if (!drivers.length) {
    return <EmptyState title="עדיין אין מובילים ברשימה" note="הרכז צריך להוסיף אתכם." />;
  }
  return (
    <div className="list">
      {drivers.map((d) => (
        <button key={d.id} className="card pad row" style={{ width: '100%', textAlign: 'start' }}
          onClick={() => onPick(d.id)}>
          <span className="grow nm">{d.name}</span>
          <Icon name="chev" size={18} />
        </button>
      ))}
    </div>
  );
}

export function MyRoute({ g, driverId, onReset }: {
  g: Gemach;
  driverId: string;
  onReset: () => void;
}) {
  const me = g.activeDrivers.find((d) => d.id === driverId);
  if (!me) {
    return (
      <EmptyState
        title="לא נמצא מסלול"
        note={<div style={{ marginTop: 12 }}>
          <button className="btn" onClick={onReset}>בחירת שם מחדש</button>
        </div>}
      />
    );
  }

  const families = g.byDriver[me.id] ?? [];
  const done = families.filter((f) => g.status[f.id] === 'delivered').length;

  return (
    <>
      <ProgressCard done={done} total={families.length} />
      {families.length === 0 ? (
        <EmptyState title="לא שובצו לכם משפחות השבוע" note="אפשר לפנות לרכז." />
      ) : (
        <div className="card" style={{ padding: '0 14px' }}>
          {families.map((f) => (
            <DeliveryRow
              key={f.id}
              family={f}
              status={g.status[f.id] ?? ''}
              onChange={(next) => void g.setStatus(f.id, next)}
            />
          ))}
        </div>
      )}
      <button className="btn ghost block" style={{ marginTop: 20 }} onClick={onReset}>
        זה לא אני
      </button>
    </>
  );
}
