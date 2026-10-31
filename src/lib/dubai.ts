import { dubai, settings } from './store'
import type { DubaiInstallment } from '../types'

export type InstallmentStatus = 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming'

export interface InstallmentRow extends DubaiInstallment {
  status: InstallmentStatus
  paidAED: number
  cumulativeAED: number
}

const today = () => new Date().toISOString().slice(0, 10)

export function dubaiSummary(now = today()) {
  const feesAED = dubai.fees.reduce((s, f) => s + f.amountAED, 0)
  const paidAED = dubai.payments.reduce((s, p) => s + p.aed, 0)
  // Сначала платежи покрывают сборы, остальное — график по порядку.
  let pool = Math.max(0, paidAED - feesAED)
  let cumulative = 0
  const rows: InstallmentRow[] = dubai.plan.map((i) => {
    cumulative += i.amountAED
    const paid = Math.min(pool, i.amountAED)
    pool -= paid
    let status: InstallmentStatus
    if (paid >= i.amountAED) status = 'paid'
    else if (i.dueDate < now) status = 'overdue'
    else if (paid > 0) status = 'partial'
    else status = daysBetween(now, i.dueDate) <= 31 ? 'due' : 'upcoming'
    return { ...i, status, paidAED: paid, cumulativeAED: cumulative }
  })

  const paidToPlanAED = rows.reduce((s, r) => s + r.paidAED, 0)
  const remainingAED = dubai.priceAED - paidToPlanAED
  const next = rows.find((r) => r.status !== 'paid')
  const mary = dubai.payments.reduce((s, p) => s + p.rub.mary, 0)
  const dima = dubai.payments.reduce((s, p) => s + p.rub.dima, 0)
  const scheduledByNow = rows.filter((r) => r.dueDate <= now).reduce((s, r) => s + r.amountAED, 0)

  // Ближайшие 12 месяцев: сколько AED и ₽ нужно и хватит ли накоплений.
  const horizon = addMonths(now, 12)
  const upcoming = rows.filter((r) => r.status !== 'paid' && r.dueDate <= horizon)

  return {
    rows,
    feesAED,
    paidAED,
    paidToPlanAED,
    remainingAED,
    paidPercent: (paidToPlanAED / dubai.priceAED) * 100,
    aheadOfScheduleAED: paidToPlanAED - scheduledByNow,
    next,
    contributionsRUB: { mary, dima, total: mary + dima },
    /** Сколько один должен другому, если доли 50/50. */
    equalizeRUB: (mary - dima) / 2,
    upcoming,
    rateRUB: settings.rates.AED,
    planningRateRUB: dubai.planningRateRUB,
  }
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

export function monthsBetween(a: string, b: string) {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}

function addMonths(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}
