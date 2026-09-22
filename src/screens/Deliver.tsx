import { useState } from 'react';
import type { Gemach } from '../lib/useGemach';
import { DeliveryRow } from '../components/DeliveryRow';
import { EmptyState, Icon, ProgressCard } from '../components/ui';

export function Deliver({ g, onToast }: { g: Gemach; onToast: (m: string) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div>
      <ProgressCard done={g.deliveredCount} total={g.activeFamilies.length} />

      {g.unassigned.length > 0 ? (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="row">
            <span className="grow"><b>{g.unassigned.length} משפחות ללא מוביל</b></span>
            <button className="btn pri sm" onClick={async () => {
              const n = await g.autoAssign();
              onToast(n ? `שובצו ${n} משפחות` : 'אין מקום פנוי אצל המובילים');
            }}>
              <Icon name="bolt" size={15} />חלק
            </button>
          </div>
        </div>
      ) : null}

      {g.activeDrivers.length === 0 ? (
        <EmptyState title="אין עדיין מובילים" note='הוסיפו אותם במסך "מובילים".' />
      ) : null}

      <div className="list">
        {g.activeDrivers.map((d) => {
          const families = g.byDriver[d.id] ?? [];
          const done = families.filter((f) => g.status[f.id] === 'delivered').length;
          const isOpen = open[d.id] ?? false;
          return (
            <div key={d.id} className="card">
              <button
                className="row pad"
                style={{ width: '100%', background: 'none', border: 0, textAlign: 'start' }}
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [d.id]: !isOpen }))}
              >
                <span className="grow">
                  <span className="nm" style={{ display: 'block' }}>{d.name}</span>
                  <span className="mt">{families.length} חבילות</span>
                </span>
                <span className={`chip ${families.length && done === families.length ? 'ok' : ''}`}>
                  {done}/{families.length}
                </span>
                <span style={{ display: 'grid', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                  <Icon name="chev" size={17} />
                </span>
              </button>

              {isOpen ? (
                <div style={{ padding: '0 14px 8px' }}>
                  {families.length === 0 ? (
                    <p className="mt" style={{ padding: '0 0 10px' }}>לא שובצו משפחות.</p>
                  ) : (
                    families.map((f) => (
                      <DeliveryRow
                        key={f.id}
                        family={f}
                        status={g.status[f.id] ?? ''}
                        onChange={(next) => void g.setStatus(f.id, next)}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
