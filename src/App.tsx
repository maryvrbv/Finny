import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useStore, type Store } from './lib/store'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Dubai from './pages/Dubai'
import Plan from './pages/Plan'
import Admin from './pages/Admin'
import Accounts from './pages/Accounts'

const tabs = [
  { id: 'overview', label: 'Обзор', icon: '📊' },
  { id: 'transactions', label: 'Траты', icon: '🧾' },
  { id: 'accounts', label: 'Счета', icon: '💳' },
  { id: 'dubai', label: 'Квартира', icon: '🏙️' },
  { id: 'plan', label: 'План', icon: '🎯' },
  { id: 'admin', label: 'Настройки', icon: '⚙️' },
] as const
type TabId = (typeof tabs)[number]['id']

const fromHash = (): TabId => tabs.find((t) => location.hash.startsWith('#' + t.id))?.id ?? 'overview'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="center muted pad">Загрузка…</div>
  if (!session) return <Login />
  return <Main email={session.user.email ?? ''} />
}

function Main({ email }: { email: string }) {
  const store = useStore()
  const [tab, setTab] = useState<TabId>(fromHash)
  useEffect(() => {
    const on = () => setTab(fromHash())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><img className="brand-mark" src="/icons/icon-192.png" alt="" /> Finny</div>
        <nav className="top-nav" aria-label="Разделы">
          {tabs.map((t) => (
            <a key={t.id} href={'#' + t.id} className={tab === t.id ? 'active' : ''}>{t.label}</a>
          ))}
        </nav>
        <div className="account">
          {store.saving && <span>Сохраняю…</span>}
          <span className="email">{email}</span>
          <button className="ghost small" onClick={() => supabase.auth.signOut()}>Выйти</button>
        </div>
      </header>

      <nav className="tabbar" aria-label="Разделы">
        {tabs.map((t) => (
          <a key={t.id} href={'#' + t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined}>
            <span className="ti" aria-hidden="true">{t.icon}</span>
            {t.label}
          </a>
        ))}
      </nav>

      {store.error && (
        <div className="banner">
          Ошибка загрузки: {store.error}
          <button onClick={store.reload}>Повторить</button>
        </div>
      )}

      <main>
        {!store.data ? (
          !store.error && <p className="muted">Загружаю данные…</p>
        ) : store.data.members.length === 0 ? (
          <div className="empty">У аккаунта {email} нет доступа к Finny. Попросите админа добавить этот email во вкладке «Настройки → Доступ».</div>
        ) : (
          <>
            {tab === 'overview' && <Overview store={store as Store} />}
            {tab === 'transactions' && <Transactions store={store as Store} />}
            {tab === 'accounts' && <Accounts store={store as Store} />}
            {tab === 'dubai' && <Dubai store={store as Store} />}
            {tab === 'plan' && <Plan store={store as Store} />}
            {tab === 'admin' && <Admin store={store as Store} />}
          </>
        )}
      </main>
    </div>
  )
}
