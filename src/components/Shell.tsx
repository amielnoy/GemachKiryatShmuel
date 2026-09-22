import type { ReactNode } from 'react';
import { Icon, type IconName } from './ui';

export interface Tab {
  key: string;
  label: string;
  icon: IconName;
}

export function Shell({
  title, subtitle, headerRight, children, tabs, activeTab, onTab, toast, showLocalWarning,
}: {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTab?: (key: string) => void;
  toast?: string | null;
  showLocalWarning?: boolean;
}) {
  return (
    <div>
      <header className="top">
        <div className="grow">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {headerRight}
      </header>

      <main className="main">
        {showLocalWarning ? (
          <div className="banner">
            הנתונים נשמרים במכשיר הזה בלבד. כדי לשתף עם המתנדבים יש לחבר בסיס נתונים — ראו README.
          </div>
        ) : null}
        {children}
      </main>

      {tabs?.length ? (
        <nav className="nav" style={{ gridTemplateColumns: `repeat(${tabs.length},1fr)` }}>
          {tabs.map((t) => (
            <button key={t.key} className={activeTab === t.key ? 'on' : ''} onClick={() => onTab?.(t.key)}>
              <Icon name={t.icon} size={22} />
              {t.label}
            </button>
          ))}
        </nav>
      ) : null}

      {toast ? (
        <div className="toastwrap" role="status">
          <div className="toast">{toast}</div>
        </div>
      ) : null}
    </div>
  );
}
