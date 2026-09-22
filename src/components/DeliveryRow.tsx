import type { DeliveryStatus, Family } from '../types';
import { ContactLinks, Icon } from './ui';

/**
 * שורת משפחה במסך החלוקה. לחיצה על השורה כולה מסמנת "נמסר" ומבטלת אותו;
 * "לא היו בבית" הוא כפתור משני שמופיע רק כשעוד לא נמסר.
 */
export function DeliveryRow({
  family, status, onChange,
}: {
  family: Family;
  status: DeliveryStatus;
  onChange: (next: DeliveryStatus) => void;
}) {
  const delivered = status === 'delivered';
  const absent = status === 'absent';

  return (
    <div>
      <button
        type="button"
        className={`drow${delivered ? ' done' : ''}${absent ? ' away' : ''}`}
        aria-pressed={delivered}
        onClick={() => onChange(delivered ? '' : 'delivered')}
      >
        <span className="tick"><Icon name={absent ? 'x' : 'check'} size={18} /></span>
        <span className="grow">
          <span className="nm" style={{ display: 'block' }}>{family.name}</span>
          <span className="mt">{family.address}</span>
        </span>
        {absent ? <span className="chip warn">לא בבית</span> : null}
      </button>

      <div style={{ paddingInlineStart: 46, paddingBottom: 6 }}>
        <ContactLinks phone={family.phone} phone2={family.phone2} address={family.address} />
        {!delivered ? (
          <button
            type="button"
            className="btn ghost sm"
            style={{ padding: '4px 0', marginTop: 6 }}
            onClick={() => onChange(absent ? '' : 'absent')}
          >
            {absent ? 'ביטול הסימון' : 'לא היו בבית'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
