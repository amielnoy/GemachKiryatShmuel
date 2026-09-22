import { useMemo, useState } from 'react';
import type { Gemach } from '../lib/useGemach';
import { clean, downloadCSV, parsePastedRows, toCSV, weekLabel } from '../lib/utils';
import { EmptyState, Icon, Sheet } from '../components/ui';

type View = 'menu' | 'import' | 'source' | 'labels' | null;

export function MoreMenu({
  g, onToast, onLock,
}: {
  g: Gemach;
  onToast: (m: string) => void;
  onLock: (() => void) | null;
}) {
  const [view, setView] = useState<View>(null);

  const exportFamilies = () => {
    const rows: unknown[][] = [
      ['מס׳', 'שם', 'כתובת', 'טלפון', 'טלפון II', 'מקור', 'ת.הצטרפות', 'ת. הסרה', 'מוביל'],
    ];
    g.families.forEach((f) => {
      const d = g.activeDrivers.find((x) => x.id === f.driverId);
      rows.push([f.num, f.name, f.address, f.phone, f.phone2, f.source, f.joinDate, f.endDate, d?.name ?? '']);
    });
    downloadCSV('משפחות.csv', toCSV(rows));
    setView(null);
  };

  return (
    <>
      <button className="ib" aria-label="תפריט" onClick={() => setView('menu')}>
        <Icon name="more" size={19} />
      </button>

      {view === 'menu' ? (
        <Sheet title="תפריט" onClose={() => setView(null)}>
          <div className="list">
            <button className="btn block" onClick={() => setView('import')}>
              <Icon name="up" size={17} />ייבוא מהגיליון
            </button>
            <button className="btn block" onClick={() => setView('labels')}>
              <Icon name="print" size={17} />מדבקות להדפסה
            </button>
            <button className="btn block" onClick={exportFamilies}>
              <Icon name="down" size={17} />ייצוא רשימת משפחות
            </button>
            <button className="btn block" onClick={() => setView('source')}>
              <Icon name="list" size={17} />דוח לפי מקור
            </button>
            {onLock ? (
              <button className="btn block" onClick={() => { onLock(); setView(null); }}>
                <Icon name="lock" size={17} />יציאה ממצב רכז
              </button>
            ) : null}
          </div>
          <p className="mt" style={{ marginTop: 16, textAlign: 'center' }}>
            אחסון: {g.store.kind === 'supabase' ? 'משותף לכל המתנדבים' : 'מקומי במכשיר זה'}
          </p>
        </Sheet>
      ) : null}

      {view === 'import' ? (
        <ImportSheet g={g} onToast={onToast} onClose={() => setView(null)} />
      ) : null}
      {view === 'source' ? <SourceSheet g={g} onClose={() => setView('menu')} /> : null}
      {view === 'labels' ? <Labels g={g} onClose={() => setView(null)} /> : null}
    </>
  );
}

function ImportSheet({ g, onToast, onClose }: {
  g: Gemach;
  onToast: (m: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => parsePastedRows(text), [text]);

  const run = async () => {
    setBusy(true);
    try {
      const n = await g.importFamilies(rows);
      onToast(`יובאו ${n} משפחות`);
      onClose();
    } catch (err) {
      console.error(err);
      onToast('הייבוא נכשל');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="ייבוא מהגיליון"
      onClose={onClose}
      footer={
        <button className="btn pri block" disabled={!rows.length || busy} onClick={run}>
          {busy ? 'מייבא…' : rows.length ? `ייבוא ${rows.length} רשומות` : 'הדביקו שורות'}
        </button>
      }
    >
      <div className="banner info">
        סמנו את השורות בגיליון, העתיקו, והדביקו כאן.<br />
        הסדר: מס׳ · שם · כתובת · טלפון · טלפון II · מקור · ת.הצטרפות · ת. הסרה
      </div>
      <textarea
        className="input"
        style={{ minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
        placeholder="הדביקו כאן…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </Sheet>
  );
}

function SourceSheet({ g, onClose }: { g: Gemach; onClose: () => void }) {
  const rows = useMemo(() => {
    const counts: Record<string, number> = {};
    g.families.forEach((f) => {
      const key = clean(f.source) || 'לא צוין';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [g.families]);

  return (
    <Sheet title="דוח לפי מקור" onClose={onClose}>
      {rows.length === 0 ? <EmptyState title="אין נתונים" /> : (
        <table className="tbl">
          <tbody>
            {rows.map(([source, count]) => (
              <tr key={source}>
                <td>{source}</td>
                <td style={{ textAlign: 'end' }}><b>{count}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}

function Labels({ g, onClose }: { g: Gemach; onClose: () => void }) {
  return (
    <div className="printroot">
      <div className="main">
        <div className="row noprint" style={{ marginBottom: 16 }}>
          <button className="btn ghost sm" onClick={onClose}>◀ סגירה</button>
          <div className="grow" />
          <button className="btn pri sm" onClick={() => window.print()}>
            <Icon name="print" size={16} />הדפסה
          </button>
        </div>
        <h2>מדבקות · שבוע {weekLabel(g.weekId)}</h2>
        <div style={{ height: 14 }} />
        {g.activeDrivers.map((d) => {
          const families = g.byDriver[d.id] ?? [];
          if (!families.length) return null;
          return (
            <div key={d.id} style={{ marginBottom: 20, breakInside: 'avoid' }}>
              <div className="sec" style={{ marginTop: 0 }}>מוביל: {d.name}</div>
              <div className="labels">
                {families.map((f) => (
                  <div className="label" key={f.id}>
                    <b>{f.name}</b>
                    <div>{f.address}</div>
                    <div style={{ color: 'var(--muted)' }}>{f.phone}</div>
                    <div style={{ marginTop: 5, fontSize: 11.5 }}>{d.name} · {weekLabel(g.weekId)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
