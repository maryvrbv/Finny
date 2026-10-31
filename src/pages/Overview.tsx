import { useMemo, useState } from 'react'
import { fmt, monthLabel, today, type Store } from '../lib/store'
import { dubaiSummary, daysBetween } from '../lib/dubai'
import { PEOPLE } from '../types'
import { BarList, Stat } from './ui'

export function useMonths(store: Store) {
  return useMemo(() => {
    const set = new Set(store.data.transactions.map((t) => t.date.slice(0, 7)))
    set.add(today().slice(0, 7))
    set.add('2026-11')
    return [...set].sort().reverse()
  }, [store.data.transactions])
}

export default function Overview({ store }: { store: Store }) {
  const { data, toRub } = store
  const months = useMonths(store)
  const [month, setMonth] = useState(today().slice(0, 7))
  const catById = Object.fromEntries(data.categories.map((c) => [c.id, c]))
  const tx = data.transactions.filter((t) => t.date.startsWith(month))
  const kind = (id: string) => catById[id]?.kind ?? 'expense'

  const expenses = tx.filter((t) => kind(t.category_id) === 'expense')
  const spent = -expenses.reduce((s, t) => s + toRub(t.amount, t.currency), 0)
  const income = tx.filter((t) => kind(t.category_id) === 'income').reduce((s, t) => s + toRub(t.amount, t.currency), 0)
  const planned = data.budget.filter((b) => b.kind === 'expense').reduce((s, l) => s + l.monthly_rub, 0)

  const byCat = new Map<string, number>()
  for (const t of expenses) byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) - toRub(t.amount, t.currency))
  const catRows = [...byCat]
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => ({ key: id, label: `${catById[id]?.emoji ?? '❓'} ${catById[id]?.name ?? id}`, value: v }))

  const byWho = (['mary', 'dima', 'joint'] as const).map((w) => ({
    key: w,
    label: PEOPLE[w],
    value: -expenses.filter((t) => t.who === w).reduce((s, t) => s + toRub(t.amount, t.currency), 0),
  }))

  const d = data.property ? dubaiSummary(data.property, data.plan, data.payments, data.rates.AED) : null
  const left = d?.next ? d.next.amount_aed - d.next.paidAED : 0

  return (
    <>
      <div className="toolbar">
        <h1>{monthLabel(month)}</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц">
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <section className="stats">
        <Stat label="Потрачено" value={fmt(spent)} sub={`план ${fmt(planned)} без квартиры`} />
        <Stat label="Доходы" value={fmt(income)} sub={`${tx.length} операций`} />
        <Stat label="Разница" value={fmt(income - spent)} />
        {d?.next && (
          <Stat
            label="🏙️ Следующий платёж за квартиру"
            value={fmt(left, 'AED')}
            sub={`${new Date(d.next.due_date).toLocaleDateString('ru-RU')} · через ${daysBetween(today(), d.next.due_date)} дн. · ≈ ${fmt(left * d.rateRUB)}`}
          />
        )}
      </section>

      {data.transactions.some((t) => t.needs_review) && (
        <a className="banner review-banner" href="#transactions-review">
          ❓ Нужно уточнить {data.transactions.filter((t) => t.needs_review).length} операций — открыть список
        </a>
      )}

      {tx.length === 0 && (
        <div className="empty">За этот месяц операций ещё нет. Присылай видео/скрины из банков — перенесу, или добавь вручную во вкладке «Траты».</div>
      )}

      <div className="grid2">
        <section className="card">
          <h2>По категориям</h2>
          <BarList rows={catRows} format={(v) => fmt(v)} />
        </section>
        <section className="card">
          <h2>Кто тратил</h2>
          <BarList rows={byWho.filter((r) => r.value > 0)} format={(v) => fmt(v)} />
        </section>
      </div>
    </>
  )
}
