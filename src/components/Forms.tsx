import { useState } from 'react';
import type { Driver, Family } from '../types';
import { clean } from '../lib/utils';
import { Field, Icon, Sheet } from './ui';

export function FamilyForm({
  initial, drivers, onSave, onDelete, onClose,
}: {
  initial: Family;
  drivers: Driver[];
  onSave: (f: Family) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState<Family>(initial);
  const [showMore, setShowMore] = useState(false);
  const set = <K extends keyof Family>(key: K) =>
    (e: { target: { value: string } }) =>
      setValue((v) => ({ ...v, [key]: e.target.value as Family[K] }));

  return (
    <Sheet
      title={initial.id ? 'עריכת משפחה' : 'משפחה חדשה'}
      onClose={onClose}
      footer={
        <div className="row" style={{ gap: 8 }}>
          <button className="btn pri grow" disabled={!clean(value.name)} onClick={() => onSave(value)}>
            שמירה
          </button>
          {onDelete ? (
            <button className="btn dngr" aria-label="מחיקה"
              onClick={() => { if (confirm('למחוק את המשפחה?')) onDelete(); }}>
              <Icon name="trash" size={16} />
            </button>
          ) : null}
        </div>
      }
    >
      <Field label="שם">
        <input className="input" value={value.name} onChange={set('name')} autoFocus />
      </Field>
      <Field label="כתובת">
        <input className="input" value={value.address} onChange={set('address')} />
      </Field>
      <Field label="טלפון">
        <input className="input" value={value.phone} onChange={set('phone')} inputMode="tel" />
      </Field>
      <Field label="מוביל">
        <select className="input" value={value.driverId} onChange={set('driverId')}>
          <option value="">— ללא —</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>

      <button className="btn ghost sm" style={{ padding: '4px 0' }} onClick={() => setShowMore((s) => !s)}>
        {showMore ? 'הסתרת פרטים נוספים' : 'פרטים נוספים'}
      </button>

      {showMore ? (
        <div style={{ marginTop: 12 }}>
          <div className="two">
            <Field label="מס׳">
              <input className="input" value={value.num} onChange={set('num')} inputMode="numeric" />
            </Field>
            <Field label="טלפון II">
              <input className="input" value={value.phone2} onChange={set('phone2')} inputMode="tel" />
            </Field>
          </div>
          <Field label="מקור (מי הפנה)">
            <input className="input" value={value.source} onChange={set('source')} />
          </Field>
          <div className="two">
            <Field label="ת. הצטרפות">
              <input className="input" type="date" value={value.joinDate} onChange={set('joinDate')} />
            </Field>
            <Field label="ת. הסרה">
              <input className="input" type="date" value={value.endDate} onChange={set('endDate')} />
            </Field>
          </div>
          <Field label="הערות">
            <textarea className="input" value={value.notes} onChange={set('notes')} />
          </Field>
          <label className="row" style={{ gap: 9 }}>
            <input type="checkbox" checked={value.active}
              onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>פעילה (מקבלת חבילה)</span>
          </label>
        </div>
      ) : null}
    </Sheet>
  );
}

export function DriverForm({
  initial, onSave, onDelete, onClose,
}: {
  initial: Driver;
  onSave: (d: Driver) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState<Driver>(initial);

  return (
    <Sheet
      title={initial.id ? 'עריכת מוביל' : 'מוביל חדש'}
      onClose={onClose}
      footer={
        <div className="row" style={{ gap: 8 }}>
          <button className="btn pri grow" disabled={!clean(value.name)} onClick={() => onSave(value)}>
            שמירה
          </button>
          {onDelete ? (
            <button className="btn dngr" aria-label="מחיקה"
              onClick={() => { if (confirm('למחוק את המוביל? המשפחות שלו יחזרו לרשימת ההמתנה.')) onDelete(); }}>
              <Icon name="trash" size={16} />
            </button>
          ) : null}
        </div>
      }
    >
      <Field label="שם">
        <input className="input" value={value.name}
          onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))} autoFocus />
      </Field>
      <Field label="טלפון">
        <input className="input" value={value.phone} inputMode="tel"
          onChange={(e) => setValue((v) => ({ ...v, phone: e.target.value }))} />
      </Field>
      <Field label="כמה חבילות מחלק">
        <select className="input" value={value.capacity}
          onChange={(e) => setValue((v) => ({ ...v, capacity: Number(e.target.value) }))}>
          {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
      <label className="row" style={{ gap: 9 }}>
        <input type="checkbox" checked={value.active}
          onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>פעיל</span>
      </label>
    </Sheet>
  );
}
