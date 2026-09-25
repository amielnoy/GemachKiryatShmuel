import { useEffect, type ReactNode } from 'react';
import { navigationHref, telHref, whatsappHref } from '../lib/utils';

/* ---------------- icons ---------------- */
export type IconName =
  | 'truck' | 'users' | 'grid' | 'plus' | 'check' | 'x' | 'phone' | 'pin'
  | 'edit' | 'trash' | 'chev' | 'more' | 'bolt' | 'print' | 'up' | 'down'
  | 'search' | 'list' | 'lock' | 'cal';

const PATHS: Record<IconName, ReactNode> = {
  truck: <><path d="M3 7h10v9H3z" /><path d="M13 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17.5" cy="9.5" r="2.5" /><path d="M16 14.6c2.8.2 5 2.2 5 5.4" /></>,
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <><path d="M6 6 18 18" /><path d="M18 6 6 18" /></>,
  phone: <path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" />,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  edit: <path d="M4 20h4L20 8l-4-4L4 16z" />,
  trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  chev: <path d="m9 5 7 7-7 7" />,
  more: <><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></>,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  print: <><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>,
  up: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  down: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.6" cy="6" r="1" /><circle cx="3.6" cy="12" r="1" /><circle cx="3.6" cy="18" r="1" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /><circle cx="12" cy="15" r="1.6" /></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ---------------- sheet ---------------- */
export function Sheet({
  title, onClose, children, footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheetbox" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheethead">
          <h3>{title}</h3>
          <button className="ib" onClick={onClose} aria-label="סגירה">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
        {footer ? <div style={{ marginTop: 16 }}>{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---------------- form field ---------------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {note}
    </div>
  );
}

/* ---------------- contact links ---------------- */
export function ContactLinks({
  phone = '', phone2 = '', address = '',
}: {
  phone?: string;
  phone2?: string;
  address?: string;
}) {
  const links: ReactNode[] = [];
  const t = telHref(phone);
  if (t) links.push(<a key="tel" className="lbtn" href={t}><Icon name="phone" size={14} />חיוג</a>);
  const w = whatsappHref(phone);
  if (w) links.push(<a key="wa" className="lbtn" href={w} target="_blank" rel="noopener noreferrer">וואטסאפ</a>);
  const t2 = telHref(phone2);
  if (t2) links.push(<a key="tel2" className="lbtn" href={t2}><Icon name="phone" size={14} />טלפון 2</a>);
  const nav = navigationHref(address);
  if (nav) links.push(<a key="nav" className="lbtn" href={nav} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={14} />ניווט</a>);

  if (!links.length) return null;
  return <div className="links">{links}</div>;
}

/* ---------------- progress ---------------- */
export function ProgressCard({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="row" style={{ marginBottom: 9 }}>
        <b className="grow">{done} מתוך {total} נמסרו</b>
        {total > 0 && done === total
          ? <span className="chip ok">הכול נמסר</span>
          : <span className="chip brand">{pct}%</span>}
      </div>
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
