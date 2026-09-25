import { useState } from 'react';
import type { BoardGroup, BoardRow, DayBoard } from '../lib/dayBoard';
import type { Gemach } from '../lib/useGemach';
import { dayLabel, dayShort, downloadCSV, toCSV } from '../lib/utils';
import { DeliveryRow } from '../components/DeliveryRow';
import { ContactLinks, EmptyState, Icon } from '../components/ui';

/**
 * מסך יום החלוקה — מי מחלק ומי מקבל.
 *
 * ליום הנוכחי אפשר גם לסמן מסירות. ימים קודמים מוצגים לקריאה בלבד, והם
 * נבנים מרשומות המסירה שנשמרו באותו יום — ולא מהשיבוץ של היום. לכן מוביל
 * שהוחלף מאז ימשיך להופיע בימים שבהם הוא באמת חילק.
 */
export function DeliveryDay({ g, onToast }: { g: Gemach; onToast: (m: string) => void }) {
  const [printing, setPrinting] = useState(false);
  const board = g.board;
  const isToday = g.selectedDayId === g.todayId;

  const days = g.daySummaries.some((d) => d.dayId === g.todayId)
    ? g.daySummaries
    : [{ dayId: g.todayId, total: 0, delivered: 0, absent: 0, pending: 0 }, ...g.daySummaries];

  const exportDay = () => {
    const rows: unknown[][] = [
      ['תאריך', 'מוביל', 'טלפון מוביל', 'משפחה', 'כתובת', 'טלפון', 'נפשות', 'סטטוס', 'שעת סימון'],
    ];
    board.groups.forEach((group) => {
      group.rows.forEach((row) => {
        rows.push([
          dayShort(board.dayId),
          group.driverName || 'ללא מוביל',
          group.phone,
          row.name,
          row.address,
          row.phone,
          row.householdSize || '',
          statusText(row),
          row.delivery.markedAt ? new Date(row.delivery.markedAt).toLocaleString('he-IL') : '',
        ]);
      });
    });
    downloadCSV(`יום-חלוקה-${board.dayId}.csv`, toCSV(rows));
    onToast('הקובץ ירד');
  };

  if (printing) return <DayPrint board={board} onClose={() => setPrinting(false)} />;

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 className="grow">יום חלוקה</h2>
        <button className="btn ghost sm" onClick={() => setPrinting(true)} disabled={!board.total}>
          <Icon name="print" size={15} />הדפסה
        </button>
        <button className="btn ghost sm" onClick={exportDay} disabled={!board.total}>
          <Icon name="down" size={15} />ייצוא
        </button>
      </div>

      <select
        className="input"
        style={{ marginBottom: 12 }}
        value={g.selectedDayId}
        onChange={(e) => g.selectDay(e.target.value)}
        aria-label="בחירת יום חלוקה"
      >
        {days.map((d) => (
          <option key={d.dayId} value={d.dayId}>
            {dayLabel(d.dayId)}
            {d.dayId === g.todayId ? ' · השבוע' : ''}
            {d.total ? ` · ${d.delivered}/${d.total} נמסרו` : ''}
          </option>
        ))}
      </select>

      <DayStats board={board} />

      {isToday && !board.recorded ? (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <b>יום החלוקה עוד לא נפתח</b>
          <p className="mt" style={{ margin: '6px 0 10px' }}>
            הרשימה למטה היא תצוגה מקדימה לפי השיבוץ הנוכחי. פתיחת היום שומרת אותה,
            וממנה והלאה היא ההיסטוריה של השבוע הזה.
          </p>
          <button
            className="btn pri block"
            onClick={async () => {
              const n = await g.openToday();
              onToast(n ? `נפתח יום חלוקה · ${n} חבילות` : 'היום כבר פתוח');
            }}
          >
            <Icon name="bolt" size={16} />פתיחת יום החלוקה
          </button>
        </div>
      ) : null}

      {!isToday ? (
        <div className="banner info">
          יום שעבר — לצפייה בלבד. הנתונים כאן הם מה שנרשם באותו יום.
        </div>
      ) : null}

      {board.total === 0 ? (
        <EmptyState
          title="אין חבילות ביום הזה"
          note='הוסיפו משפחות ומובילים, או טענו נתוני הדגמה מתפריט "…".'
        />
      ) : null}

      <div className="list">
        {board.groups.map((group) => (
          <DriverCard
            key={group.driverId || 'none'}
            group={group}
            editable={isToday}
            onMark={(familyId, next) => void g.setStatus(familyId, next)}
          />
        ))}
      </div>
    </div>
  );
}

const statusText = (row: BoardRow): string =>
  row.delivery.status === 'delivered' ? 'נמסר' : row.delivery.status === 'absent' ? 'לא היו בבית' : 'ממתין';

/* ---------------- סיכום היום ---------------- */

function DayStats({ board }: { board: DayBoard }) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="stats">
        <Stat value={board.total} label="חבילות" />
        <Stat value={board.delivered} label="נמסרו" tone="ok" />
        <Stat value={board.absent} label="לא בבית" tone="warn" />
        <Stat value={board.pending} label="ממתינות" />
      </div>
      <p className="mt" style={{ marginTop: 10 }}>
        {board.driverCount} מובילים · {board.people || '—'} נפשות
        {board.day?.notes ? ` · ${board.day.notes}` : ''}
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--text)';
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div className="mt">{label}</div>
    </div>
  );
}

/* ---------------- מוביל אחד ---------------- */

function DriverCard({
  group, editable, onMark,
}: {
  group: BoardGroup;
  editable: boolean;
  onMark: (familyId: string, next: BoardRow['delivery']['status']) => void;
}) {
  const total = group.rows.length;
  const complete = total > 0 && group.pending === 0;

  return (
    <div className="card pad">
      <div className="row">
        <div className="grow">
          <div className="nm">{group.driverName || 'ללא מוביל'}</div>
          <div className="mt">
            {group.area ? `${group.area} · ` : ''}
            {total} חבילות
          </div>
        </div>
        <span className={`chip ${complete ? 'ok' : group.driverId ? 'brand' : 'dngr'}`}>
          {group.delivered}/{total}
        </span>
      </div>

      {group.phone ? <ContactLinks phone={group.phone} /> : null}

      <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 4 }}>
        {group.rows.map((row) =>
          editable && row.family ? (
            <DeliveryRow
              key={row.delivery.id}
              family={row.family}
              status={row.delivery.status}
              onChange={(next) => onMark(row.delivery.familyId, next)}
            />
          ) : (
            <PastRow key={row.delivery.id} row={row} />
          ),
        )}
      </div>
    </div>
  );
}

/** שורה של יום שעבר: תיעוד, בלי אפשרות לשנות. */
function PastRow({ row }: { row: BoardRow }) {
  const { status } = row.delivery;
  return (
    <div className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="grow">
        <span className="nm" style={{ display: 'block' }}>{row.name}</span>
        <span className="mt">
          {row.address}
          {row.householdSize ? ` · ${row.householdSize} נפשות` : ''}
        </span>
      </span>
      {status === 'delivered' ? <span className="chip ok">נמסר</span> : null}
      {status === 'absent' ? <span className="chip warn">לא בבית</span> : null}
      {!status ? <span className="chip">לא סומן</span> : null}
    </div>
  );
}

/* ---------------- דף להדפסה ---------------- */

function DayPrint({ board, onClose }: { board: DayBoard; onClose: () => void }) {
  return (
    <div className="printroot">
      <div className="main">
        <div className="row noprint" style={{ marginBottom: 16 }}>
          <button className="btn ghost sm" onClick={onClose}>◀ חזרה</button>
          <div className="grow" />
          <button className="btn pri sm" onClick={() => window.print()}>
            <Icon name="print" size={16} />הדפסה
          </button>
        </div>

        <h2>דף חלוקה · {dayLabel(board.dayId)}</h2>
        <p className="sub">
          {board.total} חבילות · {board.driverCount} מובילים · {board.people} נפשות
        </p>

        {board.groups.map((group) => (
          <div key={group.driverId || 'none'} style={{ marginBottom: 18, breakInside: 'avoid' }}>
            <div className="sec">
              {group.driverName || 'ללא מוביל'}
              {group.phone ? ` · ${group.phone}` : ''}
              {` · ${group.rows.length} חבילות`}
            </div>
            <table className="tbl">
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.delivery.id}>
                    <td style={{ width: 28 }}>☐</td>
                    <td><b>{row.name}</b></td>
                    <td>{row.address}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.phone}</td>
                    <td style={{ textAlign: 'end' }}>{statusText(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
