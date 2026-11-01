import type { Account } from '../types'
import type { ReactNode } from 'react'

export function Stat({ label, value, sub, className = '' }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={'stat ' + className}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

/** Горизонтальные бары: одна серия, подписи слева, значения справа. */
export function BarList({ rows, format }: { rows: { key: string; label: ReactNode; value: number; hint?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="muted">Пока нет данных.</p>
  return (
    <div className="barlist" role="table">
      {rows.map((r) => (
        <div className="barrow" role="row" key={r.key} title={r.hint ?? `${format(r.value)}`}>
          <div className="barlabel" role="cell">{r.label}</div>
          <div className="bartrack" role="cell">
            <div className="bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <div className="barvalue num" role="cell">{format(r.value)}</div>
        </div>
      ))}
    </div>
  )
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress-fill" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}


/** Выбор счёта: все / группа по владельцу / конкретный счёт. */
export function AccountFilter({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (v: string) => void }) {
  const groups: [string, string][] = [['joint', 'Общий'], ['mary', 'Маша'], ['dima', 'Дима']]
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Счёт">
      <option value="">Все счета</option>
      {groups.map(([o, label]) => {
        const list = accounts.filter((a) => a.owner === o && a.kind !== 'credit')
        if (!list.length) return null
        return (
          <optgroup key={o} label={label}>
            <option value={`owner:${o}`}>{o === 'joint' ? '👫 Общие — все' : `👤 ${label} — все`}</option>
            {list.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </optgroup>
        )
      })}
    </select>
  )
}
