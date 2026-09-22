import { useMemo, useState } from 'react';
import type { Family } from '../types';
import { emptyFamily } from '../types';
import type { Gemach } from '../lib/useGemach';
import { clean, sortHe } from '../lib/utils';
import { FamilyForm } from '../components/Forms';
import { ContactLinks, EmptyState, Icon } from '../components/ui';

export function Families({ g, onToast }: { g: Gemach; onToast: (m: string) => void }) {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Family | null>(null);

  const list = useMemo(() => {
    const q = clean(query);
    return g.families
      .filter((f) => (archived ? !f.active : f.active))
      .filter((f) =>
        !q || [f.name, f.address, f.phone, f.phone2, f.num].some((v) => clean(v).includes(q)))
      .sort((a, b) => sortHe(a.name, b.name));
  }, [g.families, query, archived]);

  return (
    <div>
      <div className="row">
        <h2 className="grow">משפחות</h2>
        <button className="btn pri sm" onClick={() => setEditing(emptyFamily())}>
          <Icon name="plus" size={16} />הוספה
        </button>
      </div>
      <p className="sub">{list.length} {archived ? 'בארכיון' : 'פעילות'}</p>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', insetInlineStart: 12, top: 12, color: 'var(--muted)' }}>
          <Icon name="search" size={18} />
        </span>
        <input
          className="input"
          style={{ paddingInlineStart: 40 }}
          placeholder="חיפוש שם, כתובת או טלפון"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <button className="btn ghost sm" style={{ marginBottom: 12 }} onClick={() => setArchived((a) => !a)}>
        {archived ? '← חזרה לפעילות' : 'הצגת הארכיון'}
      </button>

      {list.length === 0 ? (
        <EmptyState title="אין רשומות" note='אפשר להוסיף ידנית או לייבא מהגיליון דרך תפריט "…".' />
      ) : null}

      <div className="list">
        {list.map((f) => {
          const driver = g.activeDrivers.find((d) => d.id === f.driverId);
          return (
            <div key={f.id} className="card pad">
              <div className="row">
                <div className="grow">
                  <div className="nm">{f.name}</div>
                  <div className="mt">{f.address}</div>
                </div>
                <button className="ib" aria-label="עריכה" onClick={() => setEditing(f)}>
                  <Icon name="edit" size={16} />
                </button>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                {driver
                  ? <span className="chip brand">{driver.name}</span>
                  : <span className="chip dngr">ללא מוביל</span>}
              </div>
              <ContactLinks phone={f.phone} phone2={f.phone2} address={f.address} />
            </div>
          );
        })}
      </div>

      {editing ? (
        <FamilyForm
          initial={editing}
          drivers={g.activeDrivers}
          onClose={() => setEditing(null)}
          onSave={async (f) => { await g.saveFamily(f); setEditing(null); onToast('נשמר'); }}
          onDelete={editing.id
            ? async () => { await g.deleteFamily(editing.id); setEditing(null); onToast('נמחק'); }
            : null}
        />
      ) : null}
    </div>
  );
}
