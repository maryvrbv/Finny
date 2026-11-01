import { useState } from 'react'
import { fmt, matchAccount, monthLabel, today, type Store } from '../lib/store'
import { AccountFilter } from './ui'
import { PEOPLE, type PersonId } from '../types'
import { useMonths } from './Overview'
import { isBig } from '../lib/big'

export default function Transactions({ store }: { store: Store }) {
  const { data, toRub } = store
  const months = useMonths(store)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [cat, setCat] = useState('')
  const [who, setWho] = useState('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [review, setReview] = useState(location.hash.includes('review'))
  const [acc, setAcc] = useState(() => location.hash.match(/acc-(.+)$/)?.[1] ?? '')

  const rows = data.transactions.filter(
    (t) =>
      (!review || t.needs_review) &&
      (review || !month || t.date.startsWith(month)) &&
      (!cat || t.category_id === cat) &&
      (!who || t.who === who) &&
      matchAccount(acc, t.account_id, data.accounts) &&
      (!q || (t.title + ' ' + (t.note ?? '')).toLowerCase().includes(q.toLowerCase())),
  )
  const total = rows.reduce((s, t) => s + toRub(t.amount, t.currency), 0)
  const upd = (id: string, patch: object) => store.update('finny_transactions', 'id', id, patch)

  const catOptions = data.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)
  const whoOptions = Object.entries(PEOPLE).map(([id, n]) => <option key={id} value={id}>{n}</option>)

  return (
    <>
      <div className="toolbar">
        <select className="month-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц">
          <option value="">Все месяцы</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button onClick={() => setAdding((v) => !v)}>{adding ? 'Отмена' : '+ Добавить'}</button>
      </div>
      <div className="filters">
        <AccountFilter accounts={data.accounts} value={acc} onChange={setAcc} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Категория">
          <option value="">Все категории</option>
          {catOptions}
        </select>
        <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Кто">
          <option value="">Все</option>
          {whoOptions}
        </select>
        <input className="search" type="search" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className={'chip' + (review ? ' on' : '')}>
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />
          ❓ К уточнению · {data.transactions.filter((t) => t.needs_review).length}
        </label>
      </div>

      {adding && <AddForm store={store} onDone={() => setAdding(false)} />}

      <MobileList store={store} rows={rows} total={total} />

      <div className="card table-wrap tx-table">
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
                  {data.categories.find((c) => c.id === t.category_id)?.kind === 'expense' && isBig(toRub(t.amount, t.currency)) && <span className="big-tag">💎 крупная</span>}
                  <input className="inline" defaultValue={t.title}
                    onBlur={(e) => e.target.value !== t.title && upd(t.id, { title: e.target.value })} />
                  <div className="muted small">{[data.accounts.find((a) => a.id === t.account_id)?.name, t.note].filter(Boolean).join(' · ')}</div>
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
  const [f, setF] = useState({ date: today(), title: '', amount: '', currency: 'RUB', category_id: 'other', who: 'joint', account_id: 'tbank-joint', note: '', sign: -1 })
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  return (
    <form
      className="card addform"
      onSubmit={async (e) => {
        e.preventDefault()
        const { sign, amount, note, ...rest } = f
        const ok = await store.insert('finny_transactions', { ...rest, account_id: rest.account_id || null, amount: sign * Math.abs(Number(amount)), note: note || null, source: 'вручную' })
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
      <select value={f.account_id} onChange={(e) => set({ account_id: e.target.value })} aria-label="Счёт">
        <option value="">Счёт не указан</option>
        {store.data.accounts.filter((a) => a.kind !== 'credit').map((a) => <option key={a.id} value={a.id}>{PEOPLE[a.owner]}: {a.name}</option>)}
      </select>
      <input placeholder="Заметка" value={f.note} onChange={(e) => set({ note: e.target.value })} />
      <button type="submit">Сохранить</button>
    </form>
  )
}

type Tx = Store['data']['transactions'][number]

/** Мобильный вид: список по дням, тап по строке раскрывает редактирование. */
function MobileList({ store, rows, total }: { store: Store; rows: Tx[]; total: number }) {
  const { data, toRub } = store
  const [open, setOpen] = useState<string | null>(null)
  const cat = Object.fromEntries(data.categories.map((c) => [c.id, c]))
  const upd = (id: string, patch: object) => store.update('finny_transactions', 'id', id, patch)
  const accName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name

  const days: [string, Tx[]][] = []
  for (const t of rows) {
    const last = days[days.length - 1]
    if (last && last[0] === t.date) last[1].push(t)
    else days.push([t.date, [t]])
  }
  const dayLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })

  if (!rows.length) return <div className="tx-list empty">Операций нет</div>
  return (
    <div className="tx-list">
      {days.map(([d, list]) => (
        <section key={d}>
          <div className="tx-day">
            <span>{dayLabel(d)}</span>
            <span className="num">{fmt(list.reduce((s, t) => s + (cat[t.category_id]?.kind === 'expense' ? toRub(t.amount, t.currency) : 0), 0))}</span>
          </div>
          <div className="tx-group">
            {list.map((t) => {
              const c = cat[t.category_id]
              const isOpen = open === t.id
              return (
                <div key={t.id} className={'tx' + (t.needs_review ? ' review' : '')}>
                  <button className="tx-row" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen}>
                    <span className="tx-ico" aria-hidden="true">{t.needs_review ? '❓' : c?.emoji ?? '📦'}</span>
                    <span className="tx-main">
                      <span className="tx-title">{c?.kind === 'expense' && isBig(toRub(t.amount, t.currency)) && <span className="big-tag">💎 крупная</span>}{t.title}</span>
                      <span className="tx-meta">{c?.name ?? t.category_id} · {PEOPLE[t.who]}{accName(t.account_id) ? ` · ${accName(t.account_id)}` : ''}</span>
                    </span>
                    <span className={'tx-amount' + (t.amount > 0 ? ' pos' : '')}>
                      {t.amount > 0 ? '+' : ''}{fmt(t.amount, t.currency === 'RUB' ? '₽' : t.currency, 2)}
                      {c?.kind === 'transfer' && <span className="cur">перевод</span>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="tx-edit">
                      <label>Название
                        <input defaultValue={t.title} onBlur={(e) => e.target.value !== t.title && upd(t.id, { title: e.target.value })} />
                      </label>
                      <div className="row2">
                        <label>Категория
                          <select value={t.category_id} onChange={(e) => upd(t.id, { category_id: e.target.value })}>
                            {data.categories.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}
                          </select>
                        </label>
                        <label>Кто
                          <select value={t.who} onChange={(e) => upd(t.id, { who: e.target.value })}>
                            {Object.entries(PEOPLE).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                          </select>
                        </label>
                      </div>
                      <div className="row2">
                        <label>Сумма, {t.currency}
                          <input type="number" inputMode="decimal" step="0.01" defaultValue={t.amount}
                            onBlur={(e) => Number(e.target.value) !== t.amount && upd(t.id, { amount: Number(e.target.value) })} />
                        </label>
                        <label>Дата
                          <input type="date" defaultValue={t.date} onBlur={(e) => e.target.value && e.target.value !== t.date && upd(t.id, { date: e.target.value })} />
                        </label>
                      </div>
                      <label>Счёт
                        <select value={t.account_id ?? ''} onChange={(e) => upd(t.id, { account_id: e.target.value || null })}>
                          <option value="">—</option>
                          {data.accounts.filter((a) => a.kind !== 'credit').map((a) => <option key={a.id} value={a.id}>{PEOPLE[a.owner]}: {a.name}</option>)}
                        </select>
                      </label>
                      {(t.note || t.source) && <div className="tx-note">{[t.note, t.source].filter(Boolean).join(' · ')}</div>}
                      <div className="actions">
                        <button className={'ghost' + (t.needs_review ? ' on' : '')} onClick={() => upd(t.id, { needs_review: !t.needs_review })}>
                          ❓ {t.needs_review ? 'Уточнено' : 'Уточнить'}
                        </button>
                        <button className="ghost" onClick={() => confirm(`Удалить «${t.title}»?`) && store.remove('finny_transactions', 'id', t.id)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <div className="tx-total"><span>Итого: {rows.length} операций</span><span className="num">{fmt(total)}</span></div>
    </div>
  )
}
