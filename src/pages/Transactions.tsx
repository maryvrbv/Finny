import { useState } from 'react'
import { fmt, monthLabel, newId, settings, toBase, type Store } from '../lib/store'
import type { PersonId, Transaction } from '../types'
import { useMonths } from './Overview'

export default function Transactions({ store }: { store: Store }) {
  const months = useMonths(store)
  const [month, setMonth] = useState(months[0])
  const [cat, setCat] = useState('')
  const [who, setWho] = useState('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const rows = store.transactions.filter(
    (t) =>
      (!month || t.date.startsWith(month)) &&
      (!cat || t.categoryId === cat) &&
      (!who || t.who === who) &&
      (!q || (t.title + ' ' + (t.note ?? '')).toLowerCase().includes(q.toLowerCase())),
  )
  const total = rows.reduce((s, t) => s + toBase(t.amount, t.currency), 0)

  const catOptions = store.categories.map((c) => (
    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
  ))

  return (
    <>
      <div className="toolbar">
        <h1>Траты</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц">
          <option value="">Все месяцы</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Категория">
          <option value="">Все категории</option>
          {catOptions}
        </select>
        <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Кто">
          <option value="">Все</option>
          {Object.entries(settings.people).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <input placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setAdding((v) => !v)}>{adding ? 'Отмена' : '+ Добавить'}</button>
      </div>

      {adding && <AddForm store={store} onDone={() => setAdding(false)} />}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Дата</th><th>Название</th><th>Категория</th><th>Кто</th>
              <th className="num">Сумма</th><th className="num">В ₽</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="nowrap">{new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</td>
                <td>
                  <input
                    className="inline"
                    defaultValue={t.title}
                    onBlur={(e) => e.target.value !== t.title && store.updateTransaction(t.id, { title: e.target.value })}
                  />
                  {t.note && <div className="muted small">{t.note}</div>}
                </td>
                <td>
                  <select value={t.categoryId} onChange={(e) => store.updateTransaction(t.id, { categoryId: e.target.value })}>
                    {catOptions}
                  </select>
                </td>
                <td>
                  <select value={t.who} onChange={(e) => store.updateTransaction(t.id, { who: e.target.value as PersonId })}>
                    {Object.entries(settings.people).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                  </select>
                </td>
                <td className={'num nowrap ' + (t.amount > 0 ? 'pos' : '')}>{fmt(t.amount, t.currency, 2)}</td>
                <td className="num nowrap muted">{t.currency === 'RUB' ? '' : fmt(toBase(t.amount, t.currency), '₽')}</td>
                <td>
                  <button className="ghost small" title="Удалить" onClick={() => confirm(`Удалить «${t.title}»?`) && store.deleteTransaction(t.id)}>✕</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="muted center">Операций нет</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr><td colSpan={5}>Итого: {rows.length} операций</td><td className="num nowrap">{fmt(total, '₽')}</td><td /></tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}

function AddForm({ store, onDone }: { store: Store; onDone: () => void }) {
  const [t, setT] = useState<Transaction>({
    id: '', date: new Date().toISOString().slice(0, 10), title: '', amount: 0,
    currency: 'RUB', categoryId: 'other', who: 'mary',
  })
  const [sign, setSign] = useState<-1 | 1>(-1)
  const set = (p: Partial<Transaction>) => setT((x) => ({ ...x, ...p }))
  return (
    <form
      className="card addform"
      onSubmit={(e) => {
        e.preventDefault()
        store.addTransaction({ ...t, id: newId(), amount: sign * Math.abs(t.amount), source: 'вручную' })
        onDone()
      }}
    >
      <input type="date" value={t.date} onChange={(e) => set({ date: e.target.value })} required />
      <input placeholder="Название" value={t.title} onChange={(e) => set({ title: e.target.value })} required />
      <select value={sign} onChange={(e) => setSign(Number(e.target.value) as -1 | 1)}>
        <option value={-1}>Расход</option><option value={1}>Доход</option>
      </select>
      <input type="number" step="0.01" placeholder="Сумма" value={t.amount || ''} onChange={(e) => set({ amount: Number(e.target.value) })} required />
      <select value={t.currency} onChange={(e) => set({ currency: e.target.value })}>
        {Object.keys(settings.rates).map((c) => <option key={c}>{c}</option>)}
      </select>
      <select value={t.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
        {store.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      <select value={t.who} onChange={(e) => set({ who: e.target.value as PersonId })}>
        {Object.entries(settings.people).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
      </select>
      <button type="submit">Сохранить</button>
    </form>
  )
}
