import { useState } from 'react'
import { budget, fmt, monthLabel, settings, toBase, type Store } from '../lib/store'
import { useMonths } from './Overview'
import { Stat } from './ui'

const rub = (v: number) => fmt(v, '₽')

export default function Plan({ store }: { store: Store }) {
  const months = useMonths(store)
  const [month, setMonth] = useState(months[0])
  const catById = Object.fromEntries(store.categories.map((c) => [c.id, c]))

  const income = budget.income.reduce((s, l) => s + l.monthlyRUB, 0)
  const savings = budget.savings.reduce((s, l) => s + l.monthlyRUB, 0)
  const planned = budget.expenses.reduce((s, l) => s + l.monthlyRUB, 0)

  const planByCat = new Map<string, number>()
  for (const l of budget.expenses) planByCat.set(l.categoryId, (planByCat.get(l.categoryId) ?? 0) + l.monthlyRUB)
  const factByCat = new Map<string, number>()
  for (const t of store.transactions)
    if (t.date.startsWith(month) && catById[t.categoryId]?.kind === 'expense')
      factByCat.set(t.categoryId, (factByCat.get(t.categoryId) ?? 0) - toBase(t.amount, t.currency))
  const cats = [...new Set([...planByCat.keys(), ...factByCat.keys()])].sort(
    (a, b) => (planByCat.get(b) ?? 0) + (factByCat.get(b) ?? 0) - (planByCat.get(a) ?? 0) - (factByCat.get(a) ?? 0),
  )

  return (
    <>
      <div className="toolbar">
        <h1>План на месяц</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц для сравнения">
          {months.map((m) => <option key={m} value={m}>факт: {monthLabel(m)}</option>)}
        </select>
      </div>
      <p className="muted small">Из листа «📊 Расходы» эксельки. Правится в <code>src/data/budget.json</code>.</p>

      <section className="stats">
        <Stat label="Доходы (с премиями)" value={rub(income)} sub="ЗП 250 000 + 250 000 + премии / 12" />
        <Stat label="Откладываем на квартиру" value={rub(savings)} sub={`${((savings / income) * 100).toFixed(0)}% дохода`} />
        <Stat label="Плановые расходы" value={rub(planned)} />
        <Stat label="Свободный остаток" value={rub(income - savings - planned)} sub="на всё, что не в плане" />
      </section>

      <section className="card table-wrap">
        <h2>План vs факт по категориям</h2>
        <table>
          <thead><tr><th>Категория</th><th className="num">План</th><th className="num">Факт</th><th className="num">Разница</th></tr></thead>
          <tbody>
            {cats.map((id) => {
              const p = planByCat.get(id) ?? 0, f = factByCat.get(id) ?? 0
              return (
                <tr key={id}>
                  <td>{catById[id]?.emoji} {catById[id]?.name ?? id}</td>
                  <td className="num">{rub(p)}</td>
                  <td className="num">{rub(f)}</td>
                  <td className={'num ' + (f > p ? 'warn' : 'ok')}>{f > p ? '! ' : ''}{rub(p - f)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="card table-wrap">
        <h2>Статьи плана</h2>
        <table>
          <thead><tr><th>Статья</th><th>Кто</th><th>Категория</th><th className="num">В месяц</th></tr></thead>
          <tbody>
            {budget.expenses.map((l, i) => (
              <tr key={i}>
                <td>{l.title}</td><td>{settings.people[l.who]}</td>
                <td className="muted">{catById[l.categoryId]?.emoji} {catById[l.categoryId]?.name}</td>
                <td className="num">{rub(l.monthlyRUB)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
