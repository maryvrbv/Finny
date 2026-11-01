import type { Account, PersonId, Transaction } from '../types'

/**
 * «Чьими деньгами оплачено».
 * Обычные счета: владелец счёта. Кошельки-посредники (Карта Пэй, Озон) пополняются
 * с разных счетов — для них каждая трата списывается из самых ранних непотраченных
 * пополнений (FIFO). Пополнения с общего счёта — «общие», остальные — владельца кошелька.
 */
export const WALLETS = new Set(['ypay-card', 'ozon-mary'])

export type Shares = Partial<Record<PersonId, number>> // доли 0..1

export function fundingShares(transactions: Transaction[], accounts: Account[]): Map<string, Shares> {
  const owner = new Map(accounts.map((a) => [a.id, a.owner]))
  const res = new Map<string, Shares>()

  for (const t of transactions) {
    const o = owner.get(t.account_id ?? '')
    if (o && !WALLETS.has(t.account_id!)) res.set(t.id, { [o]: 1 })
  }

  for (const w of WALLETS) {
    const walletOwner = owner.get(w) ?? 'mary'
    const list = transactions
      .filter((t) => t.account_id === w)
      .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount)
    const queue: { o: PersonId; amt: number }[] = []
    const paidBy = new Map<number, PersonId>() // для возвратов
    for (const t of list) {
      if (t.amount > 0) {
        const o: PersonId = /общего сч/i.test(t.title) ? 'joint'
          : t.category_id === 'transfer' ? (walletOwner === 'joint' ? 'joint' : 'mary')
          : paidBy.get(Math.round(t.amount)) ?? walletOwner
        queue.push({ o, amt: t.amount })
        res.set(t.id, { [o]: 1 })
        continue
      }
      let need = -t.amount
      const used: Shares = {}
      while (need > 0.004) {
        const head = queue[0]
        if (!head) { used[walletOwner] = (used[walletOwner] ?? 0) + need; break } // остаток с прошлого месяца
        const take = Math.min(head.amt, need)
        used[head.o] = (used[head.o] ?? 0) + take
        need -= take
        head.amt -= take
        if (head.amt <= 0.004) queue.shift()
      }
      const total = -t.amount
      const shares: Shares = {}
      for (const k of Object.keys(used) as PersonId[]) shares[k] = used[k]! / total
      res.set(t.id, shares)
      const main = (Object.keys(shares) as PersonId[]).sort((a, b) => shares[b]! - shares[a]!)[0]
      paidBy.set(Math.round(total), main)
    }
  }
  return res
}

/** Применить фильтр «Счёт»: конкретный счёт — как есть; владелец — с долями (смешанные траты делятся). */
export function scopeTransactions(transactions: Transaction[], accounts: Account[], filter: string, shares: Map<string, Shares>): Transaction[] {
  if (!filter) return transactions
  if (!filter.startsWith('owner:')) return transactions.filter((t) => t.account_id === filter)
  const o = filter.slice(6) as PersonId
  const out: Transaction[] = []
  for (const t of transactions) {
    const s = shares.get(t.id)?.[o] ?? 0
    if (s <= 0.0001) continue
    out.push(s >= 0.9999 ? t : { ...t, amount: Math.round(t.amount * s * 100) / 100, note: `Доля ${Math.round(s * 100)}% · ` + (t.note ?? '') })
  }
  return out
}

export const shareLabel = (s?: Shares) => {
  if (!s) return ''
  const keys = Object.keys(s) as PersonId[]
  if (keys.length === 1) return keys[0] === 'joint' ? 'общими' : keys[0] === 'mary' ? 'Машиными' : 'Димиными'
  return 'частично общими'
}
