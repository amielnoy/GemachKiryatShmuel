import { useCallback, useMemo, useRef, useState } from 'react';
import {
  coordinatorCodeRequired,
  createStore,
  getMyDriverId,
  isCoordinator,
  lockCoordinator,
  setMyDriverId,
  tryUnlock,
} from './lib/createStore';
import { useGemach } from './lib/useGemach';
import { weekLabel } from './lib/utils';
import { Shell, type Tab } from './components/Shell';
import { Field, Icon, Sheet } from './components/ui';
import { Deliver } from './screens/Deliver';
import { Families } from './screens/Families';
import { Drivers } from './screens/Drivers';
import { MyRoute, PickMe } from './screens/MyRoute';
import { MoreMenu } from './screens/MoreMenu';

const TABS: Tab[] = [
  { key: 'deliver', label: 'חלוקה', icon: 'truck' },
  { key: 'families', label: 'משפחות', icon: 'users' },
  { key: 'drivers', label: 'מובילים', icon: 'grid' },
];

export default function App() {
  // חנות אחת לכל חיי הדף — יצירה מחדש הייתה פותחת מנוי realtime נוסף
  const storeRef = useRef(createStore());
  const g = useGemach(storeRef.current);

  const [coordinator, setCoordinator] = useState(isCoordinator);
  const [driverId, setDriverId] = useState(getMyDriverId);
  const [tab, setTab] = useState('deliver');
  const [toast, setToast] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const resetDriver = useCallback(() => {
    setMyDriverId(null);
    setDriverId(null);
  }, []);

  const localWarning = g.store.kind === 'local';
  const subtitle = useMemo(
    () => `שבוע ${weekLabel(g.weekId)} · ${g.deliveredCount}/${g.activeFamilies.length} נמסרו`,
    [g.weekId, g.deliveredCount, g.activeFamilies.length],
  );

  if (g.loading) {
    return <div className="spin" role="status" aria-label="טוען" />;
  }

  /* ---------- מתנדב ---------- */
  if (!coordinator) {
    const me = driverId ? g.activeDrivers.find((d) => d.id === driverId) : null;
    return (
      <>
        <Shell
          title={me ? me.name : 'גמ"ח מזון'}
          subtitle={me ? `שבוע ${weekLabel(g.weekId)}` : 'בחרו את שמכם'}
          showLocalWarning={localWarning}
          toast={toast}
          headerRight={
            <button className="ib" aria-label="כניסת רכז" onClick={() => setShowUnlock(true)}>
              <Icon name="lock" size={18} />
            </button>
          }
        >
          {driverId
            ? <MyRoute g={g} driverId={driverId} onReset={resetDriver} />
            : <PickMe drivers={g.activeDrivers} onPick={(id) => { setMyDriverId(id); setDriverId(id); }} />}
        </Shell>
        {showUnlock ? (
          <UnlockSheet
            onClose={() => setShowUnlock(false)}
            onUnlocked={() => { setCoordinator(true); setShowUnlock(false); showToast('ברוך הבא, רכז'); }}
          />
        ) : null}
      </>
    );
  }

  /* ---------- רכז ---------- */
  return (
    <Shell
      title='גמ"ח מזון'
      subtitle={subtitle}
      showLocalWarning={localWarning}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
      toast={toast}
      headerRight={
        <MoreMenu
          g={g}
          onToast={showToast}
          onLock={coordinatorCodeRequired()
            ? () => { lockCoordinator(); setCoordinator(false); }
            : null}
        />
      }
    >
      {tab === 'deliver' ? <Deliver g={g} onToast={showToast} /> : null}
      {tab === 'families' ? <Families g={g} onToast={showToast} /> : null}
      {tab === 'drivers' ? <Drivers g={g} onToast={showToast} /> : null}
    </Shell>
  );
}

function UnlockSheet({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (tryUnlock(code)) onUnlocked();
    else setError(true);
  };

  return (
    <Sheet
      title="כניסת רכז"
      onClose={onClose}
      footer={<button className="btn pri block" onClick={submit}>כניסה</button>}
    >
      <Field label="קוד רכז">
        <input
          className="input"
          type="password"
          value={code}
          autoFocus
          onChange={(e) => { setCode(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
      {error ? <p style={{ color: 'var(--danger)', fontSize: 14, margin: 0 }}>קוד שגוי</p> : null}
    </Sheet>
  );
}
