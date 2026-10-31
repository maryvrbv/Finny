import { useMemo, useState } from 'react'
import { budget, fmt, monthLabel, settings, toBase, type Store } from '../lib/store'
import { dubaiSummary, daysBetween } from '../lib/dubai'
import { BarList, Stat } from './ui'

export function useMonths(store: Store) {
  return useMemo(() => {
    const set = new Set(store.transactions.map((t) => t.date.slice(0, 7)))
    set.add('2026-11')
    return [...set].sort().reverse()
  }, [store.transactions])
}

export default function Overview({ store }: { store: Store }) {
  const months = useMonths(store)
  const [month, setMonth] = useState(months[0])
  const catById = Object.fromEntries(store.categories.map((c) => [c.id, c]))
  const tx = store.transactions.filter((t) => t.date.startsWith(month))
  const kind = (id: string) => catById[id]?.kind ?? 'expense'

  const expenses = tx.filter((t) => kind(t.categoryId) === 'expense')
  const spent = -expenses.reduce((s, t) => s + toBase(t.amount, t.currency), 0)
  const income = tx.filter((t) => kind(t.categoryId) === 'income').reduce((s, t) => s + toBase(t.amount, t.currency), 0)
  const plannedExpenses = budget.expenses.reduce((s, l) => s + l.monthlyRUB, 0)

  const byCat = new Map<string, number>()
  for (const t of expenses) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) - toBase(t.amount, t.currency))
  const catRows = [...byCat]
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => ({ key: id, label: `${catById[id]?.emoji ?? '❓'} ${catById[id]?.name ?? id}`, value: v }))

  const byWho = (['mary', 'dima', 'joint'] as const).map((w) => ({
    key: w,
    label: settings.people[w],
    value: -expenses.filter((t) => t.who === w).reduce((s, t) => s + toBase(t.amount, t.currency), 0),
  }))

  const d = dubaiSummary()
  const rub = (v: number) => fmt(v, '₽')

  return (
    <>
      <div className="toolbar">
        <h1>{monthLabel(month)}</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц">
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <section className="stats">
        <Stat label="Потрачено" value={rub(spent)} sub={`план ${rub(plannedExpenses)} без квартиры`} />
        <Stat label="Доходы" value={rub(income)} sub={`${tx.length} операций`} />
        <Stat label="Разница" value={rub(income - spent)} />
        {d.next && (
          <Stat
            label="🏙️ Следующий платёж за квартиру"
            value={fmt(d.next.amountAED - d.next.paidAED, 'AED')}
            sub={`${new Date(d.next.dueDate).toLocaleDateString('ru-RU')} · через ${daysBetween(new Date().toISOString().slice(0, 10), d.next.dueDate)} дн. · ≈ ${rub((d.next.amountAED - d.next.paidAED) * d.rateRUB)}`}
          />
        )}
      </section>

      {tx.length === 0 && (
        <div className="empty">
          За этот месяц трат ещё нет. Присылай видео/скрины из банков — я перенесу операции в
          <code> src/data/transactions/{month}.json</code>.
        </div>
      )}

      <div className="grid2">
        <section className="card">
          <h2>По категориям</h2>
          <BarList rows={catRows} format={rub} />
        </section>
        <section className="card">
          <h2>Кто тратил</h2>
          <BarList rows={byWho.filter((r) => r.value > 0)} format={rub} />
        </section>
      </div>
    </>
  )
}
