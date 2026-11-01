import { useState } from 'react'
import { fmt, today, type Store } from '../lib/store'
import { ACCOUNT_KINDS, PEOPLE, type Account, type PersonId } from '../types'
import { Stat } from './ui'

const dateShort = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '')

export default function Accounts({ store }: { store: Store }) {
  const { data, toRub } = store
  const accs = data.accounts.filter((a) => a.active)
  const rub = (a: Account) => (a.balance == null ? 0 : toRub(a.balance, a.currency))
  const assets = accs.filter((a) => a.kind !== 'credit')
  const debts = accs.filter((a) => a.kind === 'credit')
  const sum = (list: Account[]) => list.reduce((s, a) => s + rub(a), 0)
  const total = sum(assets)
  const debt = sum(debts)
  const unknown = assets.filter((a) => a.balance == null)
  const byOwner = (o: PersonId) => sum(assets.filter((a) => a.owner === o))

  return (
    <>
      <div className="toolbar"><h1>Счета</h1></div>

      <section className="stats">
        <Stat className="wide accent" label="💰 Доступно всего" value={fmt(total)}
          sub={unknown.length ? `без ${unknown.length} счетов с неизвестным остатком` : 'по всем счетам'} />
        <Stat label="👤 Маша" value={fmt(byOwner('mary'))} />
        <Stat label="👤 Дима" value={fmt(byOwner('dima'))} sub={!assets.some((a) => a.owner === 'dima') ? 'счета не добавлены' : undefined} />
        <Stat label="👫 Общее" value={fmt(byOwner('joint'))} />
        {debts.length > 0 && <Stat label="🧾 Долги и рассрочки" value={fmt(debt)} sub={`за вычетом: ${fmt(total + debt)}`} />}
      </section>

      {(['joint', 'mary', 'dima'] as PersonId[]).map((o) => {
        const list = accs.filter((a) => a.owner === o)
        return (
          <section className="card" key={o}>
            <h2>{o === 'joint' ? '👫 Общие' : `👤 ${PEOPLE[o]}`}</h2>
            {list.length ? (
              <ul className="op-list">{list.map((a) => <AccountRow key={a.id} a={a} store={store} />)}</ul>
            ) : (
              <p className="muted small">Счетов пока нет — добавь в «⚙️ Настройки → Счета» или пришли скрин, я внесу.</p>
            )}
          </section>
        )
      })}
      <p className="muted small">Остатки обновляются вручную: нажми на счёт и впиши текущую сумму. Дата обновится сама.</p>
    </>
  )
}

function AccountRow({ a, store }: { a: Account; store: Store }) {
  const [edit, setEdit] = useState(false)
  const stale = a.balance_date && (Date.now() - Date.parse(a.balance_date)) / 86400000 > 31
  const count = store.data.transactions.filter((t) => t.account_id === a.id).length
  return (
    <li className="acc-row" style={{ gridTemplateColumns: '1fr auto' }}>
      <button className="acc-btn" onClick={() => setEdit((v) => !v)} aria-expanded={edit}>
        <span className="op-main">
          <span className="op-title">{ACCOUNT_KINDS[a.kind].split(' ')[0]} {a.name}</span>
          <span className="op-meta">
            {[a.bank, a.rate ? `${a.rate}%` : null, a.balance_date ? `на ${dateShort(a.balance_date)}` : 'остаток неизвестен', count ? `${count} операций` : null]
              .filter(Boolean).join(' · ')}
            {stale && <span className="warn"> · давно не обновлялся</span>}
          </span>
        </span>
      </button>
      <span className={'op-amount num' + ((a.balance ?? 0) < 0 ? ' warn' : '')}>
        {a.balance == null ? '—' : fmt(a.balance, a.currency === 'RUB' ? '₽' : a.currency, 2)}
      </span>
      {edit && (
        <form
          className="acc-edit"
          onSubmit={async (e) => {
            e.preventDefault()
            const v = (new FormData(e.currentTarget).get('balance') as string).replace(/\s/g, '').replace(',', '.')
            await store.update('finny_accounts', 'id', a.id, { balance: v === '' ? null : Number(v), balance_date: today() })
            setEdit(false)
          }}
        >
          <input name="balance" inputMode="decimal" defaultValue={a.balance ?? ''} placeholder="Остаток сейчас" aria-label="Остаток" autoFocus />
          <button type="submit">Сохранить</button>
          {a.note && <div className="tx-note" style={{ gridColumn: '1 / -1' }}>{a.note}</div>}
          {count > 0 && <a className="small" style={{ gridColumn: '1 / -1' }} href={`#transactions-acc-${a.id}`}>Показать операции по счёту →</a>}
        </form>
      )}
    </li>
  )
}
