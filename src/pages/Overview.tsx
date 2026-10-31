import { useMemo, useState } from 'react'
import { fmt, monthLabel, today, type Store } from '../lib/store'
import { dubaiSummary, daysBetween } from '../lib/dubai'
import { PEOPLE } from '../types'
import { BarList, Stat } from './ui'
import { BIG_PURCHASE_RUB, isBig } from '../lib/big'
import type { Transaction } from '../types'

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
  const big = expenses
    .filter((t) => isBig(toRub(t.amount, t.currency)))
    .sort((a, b) => toRub(a.amount, a.currency) - toRub(b.amount, b.currency))
  const bigTotal = -big.reduce((s, t) => s + toRub(t.amount, t.currency), 0)
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
        <select className="month-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месяц">
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <section className="stats">
        <Stat label="Потрачено" value={fmt(spent)} sub={`план ${fmt(planned)} без квартиры`} />
        <Stat label="Без крупных покупок" value={fmt(spent - bigTotal)} sub={`💎 крупные: ${fmt(bigTotal)}`} />
        <Stat label="Доходы" value={fmt(income)} sub={`${tx.length} операций`} />
        <Stat label="Баланс месяца" value={fmt(income - spent)} sub="доходы − расходы" />
        {d?.next && (
          <Stat
            className="wide accent"
            label="🏙️ Следующий платёж за квартиру"
            value={fmt(left, 'AED')}
            sub={`${new Date(d.next.due_date).toLocaleDateString('ru-RU')} · через ${daysBetween(today(), d.next.due_date)} дн. · ≈ ${fmt(left * d.rateRUB)}`}
          />
        )}
      </section>

      {data.transactions.some((t) => t.needs_review) && (
        <a className="banner review-banner" href="#transactions-review">
          ❓ Нужно уточнить: {data.transactions.filter((t) => t.needs_review).length} — открыть →
        </a>
      )}

      {tx.length === 0 && (
        <div className="empty">За этот месяц операций ещё нет. Присылай видео/скрины из банков — перенесу, или добавь вручную во вкладке «Траты».</div>
      )}

      {big.length > 0 && (
        <section className="card">
          <h2>💎 Крупные покупки месяца <span className="muted small">· от {fmt(BIG_PURCHASE_RUB)}</span></h2>
          <ul className="op-list">
            {big.map((t) => (
              <li key={t.id}>
                <span className="op-ico">{catById[t.category_id]?.emoji ?? '📦'}</span>
                <span className="op-main">
                  <span className="op-title">{t.title}</span>
                  <span className="op-meta">{dayShort(t.date)} · {catById[t.category_id]?.name}</span>
                </span>
                <span className="op-amount num">{fmt(toRub(t.amount, t.currency))}</span>
              </li>
            ))}
          </ul>
          <div className="op-total"><span>Итого крупных</span><span className="num">{fmt(bigTotal)}</span></div>
        </section>
      )}

      <div className="grid2">
        <section className="card">
          <h2>По категориям</h2>
          <CategoryBreakdown rows={catRows} txByCat={expenses} toRub={toRub} />
        </section>
        <section className="card">
          <h2>Кто тратил</h2>
          <BarList rows={byWho.filter((r) => r.value > 0)} format={(v) => fmt(v)} />
        </section>
      </div>
    </>
  )
}

const dayShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

/** Категории как раскрывающийся список: бар + сумма, по тапу — все операции категории. */
function CategoryBreakdown({ rows, txByCat, toRub }: {
  rows: { key: string; label: string; value: number }[]
  txByCat: Transaction[]
  toRub: (a: number, c: string) => number
}) {
  const [open, setOpen] = useState<string | null>(null)
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="muted">Пока нет данных.</p>
  return (
    <div className="barlist">
      {rows.map((r) => {
        const isOpen = open === r.key
        const list = txByCat.filter((t) => t.category_id === r.key).sort((a, b) => b.date.localeCompare(a.date))
        const bigCount = list.filter((t) => isBig(toRub(t.amount, t.currency))).length
        return (
          <div key={r.key} className={'cat' + (isOpen ? ' open' : '')}>
            <button className="barrow cat-row" onClick={() => setOpen(isOpen ? null : r.key)} aria-expanded={isOpen}>
              <span className="barlabel cat-label">
                <span className="cat-name">{r.label}</span>
                {bigCount > 0 && <span className="big-dot" title="Есть крупные покупки">💎</span>}
              </span>
              <span className="bartrack"><span className="bar" style={{ width: `${(r.value / max) * 100}%` }} /></span>
              <span className="barvalue num">{fmt(r.value)} <span className="chev" aria-hidden="true">{isOpen ? '▴' : '▾'}</span></span>
            </button>
            {isOpen && (
              <ul className="op-list nested">
                {list.map((t) => {
                  const rub = toRub(t.amount, t.currency)
                  return (
                    <li key={t.id} className={isBig(rub) ? 'big' : ''}>
                      <span className="op-main">
                        <span className="op-title">{isBig(rub) && '💎 '}{t.title}</span>
                        <span className="op-meta">{dayShort(t.date)}{t.currency !== 'RUB' ? ` · ${fmt(t.amount, t.currency, 2)}` : ''}</span>
                      </span>
                      <span className={'op-amount num' + (rub > 0 ? ' pos' : '')}>{rub > 0 ? '+' : ''}{fmt(rub)}</span>
                    </li>
                  )
                })}
                <li className="op-foot"><span className="muted small">{list.length} операций</span></li>
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
