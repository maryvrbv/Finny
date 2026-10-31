import { useState } from 'react'
import { fmt, monthLabel, today, type Store } from '../lib/store'
import { PEOPLE } from '../types'
import { useMonths } from './Overview'
import { Stat } from './ui'

export default function Plan({ store }: { store: Store }) {
  const { data, toRub } = store
  const months = useMonths(store)
  const [month, setMonth] = useState(today().slice(0, 7))
  const catById = Object.fromEntries(data.categories.map((c) => [c.id, c]))
  const sum = (k: string) => data.budget.filter((b) => b.kind === k).reduce((s, l) => s + l.monthly_rub, 0)
  const income = sum('income'), savings = sum('savings'), planned = sum('expense')

  const planByCat = new Map<string, number>()
  for (const l of data.budget) if (l.kind === 'expense' && l.category_id) planByCat.set(l.category_id, (planByCat.get(l.category_id) ?? 0) + l.monthly_rub)
  const factByCat = new Map<string, number>()
  for (const t of data.transactions)
    if (t.date.startsWith(month) && catById[t.category_id]?.kind === 'expense')
      factByCat.set(t.category_id, (factByCat.get(t.category_id) ?? 0) - toRub(t.amount, t.currency))
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
      <p className="muted small">Статьи плана редактируются во вкладке «Настройки».</p>

      <section className="stats">
        <Stat label="Доходы (с премиями)" value={fmt(income)} />
        <Stat label="Откладываем на квартиру" value={fmt(savings)} sub={income ? `${((savings / income) * 100).toFixed(0)}% дохода` : ''} />
        <Stat label="Плановые расходы" value={fmt(planned)} />
        <Stat label="Свободный остаток" value={fmt(income - savings - planned)} sub="на всё, что не в плане" />
      </section>

      <section className="card table-wrap">
        <h2>План vs факт по категориям</h2>
        <table>
          <thead><tr><th>Категория</th><th className="num">План</th><th className="num">Факт</th><th className="num">Остаток</th></tr></thead>
          <tbody>
            {cats.map((id) => {
              const p = planByCat.get(id) ?? 0, f = factByCat.get(id) ?? 0
              return (
                <tr key={id}>
                  <td>{catById[id]?.emoji} {catById[id]?.name ?? id}</td>
                  <td className="num">{fmt(p)}</td>
                  <td className="num">{fmt(f)}</td>
                  <td className={'num ' + (f > p ? 'warn' : 'ok')}>{f > p ? '! ' : ''}{fmt(p - f)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="card table-wrap">
        <h2>Статьи плана</h2>
        <table>
          <thead><tr><th>Тип</th><th>Статья</th><th>Кто</th><th>Категория</th><th className="num">В месяц</th></tr></thead>
          <tbody>
            {data.budget.map((l) => (
              <tr key={l.id}>
                <td className="muted small">{{ income: 'Доход', savings: 'Накопления', expense: 'Расход' }[l.kind]}</td>
                <td>{l.title}</td><td>{PEOPLE[l.who]}</td>
                <td className="muted">{l.category_id && `${catById[l.category_id]?.emoji} ${catById[l.category_id]?.name}`}</td>
                <td className="num">{fmt(l.monthly_rub)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
