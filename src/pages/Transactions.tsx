import { useState } from 'react'
import { fmt, monthLabel, today, type Store } from '../lib/store'
import { PEOPLE, type PersonId } from '../types'
import { useMonths } from './Overview'

export default function Transactions({ store }: { store: Store }) {
  const { data, toRub } = store
  const months = useMonths(store)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [cat, setCat] = useState('')
  const [who, setWho] = useState('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [review, setReview] = useState(location.hash.includes('review'))

  const rows = data.transactions.filter(
    (t) =>
      (!review || t.needs_review) &&
      (review || !month || t.date.startsWith(month)) &&
      (!cat || t.category_id === cat) &&
      (!who || t.who === who) &&
      (!q || (t.title + ' ' + (t.note ?? '')).toLowerCase().includes(q.toLowerCase())),
  )
  const total = rows.reduce((s, t) => s + toRub(t.amount, t.currency), 0)
  const upd = (id: string, patch: object) => store.update('finny_transactions', 'id', id, patch)

  const catOptions = data.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)
  const whoOptions = Object.entries(PEOPLE).map(([id, n]) => <option key={id} value={id}>{n}</option>)

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
          {whoOptions}
        </select>
        <input placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />
          ❓ К уточнению ({data.transactions.filter((t) => t.needs_review).length})
        </label>
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
              <tr key={t.id} className={t.needs_review ? 'review' : ''}>
                <td className="nowrap">
                  <input type="date" className="inline date" defaultValue={t.date}
                    onBlur={(e) => e.target.value && e.target.value !== t.date && upd(t.id, { date: e.target.value })} />
                </td>
                <td>
                  <input className="inline" defaultValue={t.title}
                    onBlur={(e) => e.target.value !== t.title && upd(t.id, { title: e.target.value })} />
                  {(t.note || t.source) && <div className="muted small">{[t.note, t.source].filter(Boolean).join(' · ')}</div>}
                </td>
                <td>
                  <select value={t.category_id} onChange={(e) => upd(t.id, { category_id: e.target.value })}>{catOptions}</select>
                </td>
                <td>
                  <select value={t.who} onChange={(e) => upd(t.id, { who: e.target.value as PersonId })}>{whoOptions}</select>
                </td>
                <td className={'num nowrap ' + (t.amount > 0 ? 'pos' : '')}>
                  <input type="number" step="0.01" className="inline num amount" defaultValue={t.amount}
                    onBlur={(e) => Number(e.target.value) !== t.amount && upd(t.id, { amount: Number(e.target.value) })} />
                  <span className="muted small"> {t.currency}</span>
                </td>
                <td className="num nowrap muted">{t.currency === 'RUB' ? '' : fmt(toRub(t.amount, t.currency))}</td>
                <td className="nowrap">
                  <button
                    className={'ghost small' + (t.needs_review ? ' on' : '')}
                    title={t.needs_review ? 'Снять метку «уточнить»' : 'Пометить «нужно уточнить»'}
                    onClick={() => upd(t.id, { needs_review: !t.needs_review })}
                  >❓</button>{' '}
                  <button className="ghost small" title="Удалить"
                    onClick={() => confirm(`Удалить «${t.title}»?`) && store.remove('finny_transactions', 'id', t.id)}>✕</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="muted center">Операций нет</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr><td colSpan={5}>Итого: {rows.length} операций</td><td className="num nowrap">{fmt(total)}</td><td /></tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}

function AddForm({ store, onDone }: { store: Store; onDone: () => void }) {
  const [f, setF] = useState({ date: today(), title: '', amount: '', currency: 'RUB', category_id: 'other', who: 'joint', note: '', sign: -1 })
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  return (
    <form
      className="card addform"
      onSubmit={async (e) => {
        e.preventDefault()
        const { sign, amount, note, ...rest } = f
        const ok = await store.insert('finny_transactions', { ...rest, amount: sign * Math.abs(Number(amount)), note: note || null, source: 'вручную' })
        if (ok) onDone()
      }}
    >
      <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} required />
      <input placeholder="Название" value={f.title} onChange={(e) => set({ title: e.target.value })} required />
      <select value={f.sign} onChange={(e) => set({ sign: Number(e.target.value) })}>
        <option value={-1}>Расход</option><option value={1}>Доход</option>
      </select>
      <input type="number" step="0.01" placeholder="Сумма" value={f.amount} onChange={(e) => set({ amount: e.target.value })} required />
      <select value={f.currency} onChange={(e) => set({ currency: e.target.value })}>
        {store.data.rateRows.map((r) => <option key={r.currency}>{r.currency}</option>)}
      </select>
      <select value={f.category_id} onChange={(e) => set({ category_id: e.target.value })}>
        {store.data.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      <select value={f.who} onChange={(e) => set({ who: e.target.value })}>
        {Object.entries(PEOPLE).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
      </select>
      <input placeholder="Заметка" value={f.note} onChange={(e) => set({ note: e.target.value })} />
      <button type="submit">Сохранить</button>
    </form>
  )
}
