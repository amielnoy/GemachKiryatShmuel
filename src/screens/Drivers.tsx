import { useState } from 'react';
import type { Driver } from '../types';
import { emptyDriver } from '../types';
import type { Gemach } from '../lib/useGemach';
import { DriverForm } from '../components/Forms';
import { EmptyState, Icon } from '../components/ui';

export function Drivers({ g, onToast }: { g: Gemach; onToast: (m: string) => void }) {
  const [editing, setEditing] = useState<Driver | null>(null);

  return (
    <div>
      <div className="row">
        <h2 className="grow">מובילים</h2>
        <button className="btn pri sm" onClick={() => setEditing(emptyDriver())}>
          <Icon name="plus" size={16} />הוספה
        </button>
      </div>
      <p className="sub">כל מוביל מקבל עד מספר החבילות שהגדרתם לו</p>

      {g.unassigned.length > 0 ? (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <b className="grow">{g.unassigned.length} משפחות ממתינות לשיבוץ</b>
            <button className="btn pri sm" onClick={async () => {
              const n = await g.autoAssign();
              onToast(n ? `שובצו ${n} משפחות` : 'אין מקום פנוי אצל המובילים');
            }}>
              <Icon name="bolt" size={15} />חלק אוטומטית
            </button>
          </div>
          <div className="list">
            {g.unassigned.map((f) => (
              <div key={f.id} className="row">
                <span className="grow trunc">{f.name}</span>
                <select
                  className="input"
                  style={{ maxWidth: 150, padding: '7px 10px' }}
                  value=""
                  onChange={(e) => { if (e.target.value) void g.assign(f.id, e.target.value); }}
                >
                  <option value="">שבץ ל…</option>
                  {g.activeDrivers.map((d) => {
                    const n = g.byDriver[d.id]?.length ?? 0;
                    return (
                      <option key={d.id} value={d.id} disabled={n >= d.capacity}>
                        {d.name} ({n}/{d.capacity})
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {g.activeDrivers.length === 0 ? (
        <EmptyState title="אין מובילים" note="הוסיפו את המתנדבים שמחלקים את החבילות." />
      ) : null}

      <div className="list">
        {g.activeDrivers.map((d) => {
          const families = g.byDriver[d.id] ?? [];
          const full = families.length >= d.capacity;
          return (
            <div key={d.id} className="card pad">
              <div className="row">
                <div className="grow">
                  <div className="nm">{d.name}</div>
                  <div className="mt">{d.phone}</div>
                </div>
                <span className={`chip ${full ? 'ok' : families.length ? 'brand' : 'warn'}`}>
                  {families.length}/{d.capacity}
                </span>
                <button className="ib" aria-label="עריכה" onClick={() => setEditing(d)}>
                  <Icon name="edit" size={16} />
                </button>
              </div>
              {families.length > 0 ? (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  {families.map((f) => (
                    <div key={f.id} className="row" style={{ padding: '4px 0' }}>
                      <span className="grow trunc" style={{ fontSize: 14.5 }}>{f.name}</span>
                      <button className="btn ghost sm" aria-label="הסרה מהמסלול"
                        onClick={() => void g.assign(f.id, '')}>
                        <Icon name="x" size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {editing ? (
        <DriverForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (d) => { await g.saveDriver(d); setEditing(null); onToast('נשמר'); }}
          onDelete={editing.id
            ? async () => { await g.deleteDriver(editing.id); setEditing(null); onToast('נמחק'); }
            : null}
        />
      ) : null}
    </div>
  );
}
