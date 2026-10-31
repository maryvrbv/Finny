import { useEffect, useState } from 'react'
import { useStore } from './lib/store'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Dubai from './pages/Dubai'
import Plan from './pages/Plan'
import Categories from './pages/Categories'

const tabs = [
  { id: 'overview', label: 'Обзор' },
  { id: 'transactions', label: 'Траты' },
  { id: 'dubai', label: '🏙️ Квартира' },
  { id: 'plan', label: 'План' },
  { id: 'categories', label: 'Категории' },
] as const
type TabId = (typeof tabs)[number]['id']

const fromHash = (): TabId => (tabs.find((t) => '#' + t.id === location.hash)?.id ?? 'overview')

export default function App() {
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
        <div className="brand">💰 Finny <span className="muted">· Маша и Дима</span></div>
        <nav>
          {tabs.map((t) => (
            <a key={t.id} href={'#' + t.id} className={tab === t.id ? 'active' : ''}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      {store.hasLocalChanges && (
        <div className="banner">
          Есть правки, сохранённые только в этом браузере.
          <button onClick={store.exportJson}>Экспорт JSON</button>
          <button className="ghost" onClick={() => confirm('Сбросить локальные правки?') && store.resetLocal()}>
            Сбросить
          </button>
        </div>
      )}

      <main>
        {tab === 'overview' && <Overview store={store} />}
        {tab === 'transactions' && <Transactions store={store} />}
        {tab === 'dubai' && <Dubai />}
        {tab === 'plan' && <Plan store={store} />}
        {tab === 'categories' && <Categories store={store} />}
      </main>
    </div>
  )
}
