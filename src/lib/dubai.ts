import type { DubaiPayment, Installment, Property } from '../types'
import { today } from './store'

export type InstallmentStatus = 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming'

export interface InstallmentRow extends Installment {
  status: InstallmentStatus
  paidAED: number
  cumulativeAED: number
}

export function dubaiSummary(property: Property, plan: Installment[], payments: DubaiPayment[], rateRUB: number, now = today()) {
  const feesAED = property.fees.reduce((s, f) => s + f.amountAED, 0)
  const paidAED = payments.reduce((s, p) => s + p.aed, 0)
  // Сначала платежи покрывают сборы, остальное — график по порядку.
  let pool = Math.max(0, paidAED - feesAED)
  let cumulative = 0
  const rows: InstallmentRow[] = plan.map((i) => {
    cumulative += i.amount_aed
    const paid = Math.min(pool, i.amount_aed)
    pool -= paid
    let status: InstallmentStatus
    if (paid >= i.amount_aed) status = 'paid'
    else if (i.due_date < now) status = 'overdue'
    else if (paid > 0) status = 'partial'
    else status = daysBetween(now, i.due_date) <= 31 ? 'due' : 'upcoming'
    return { ...i, status, paidAED: paid, cumulativeAED: cumulative }
  })

  const paidToPlanAED = rows.reduce((s, r) => s + r.paidAED, 0)
  const nextIdx = rows.findIndex((r) => r.status !== 'paid')
  const mary = payments.reduce((s, p) => s + p.rub_mary, 0)
  const dima = payments.reduce((s, p) => s + p.rub_dima, 0)
  const scheduledByNow = rows.filter((r) => r.due_date <= now).reduce((s, r) => s + r.amount_aed, 0)
  const horizon = addMonths(now, 12)

  return {
    rows,
    feesAED,
    paidAED,
    paidToPlanAED,
    remainingAED: property.price_aed - paidToPlanAED,
    paidPercent: property.price_aed ? (paidToPlanAED / property.price_aed) * 100 : 0,
    aheadOfScheduleAED: paidToPlanAED - scheduledByNow,
    next: nextIdx >= 0 ? rows[nextIdx] : undefined,
    lastPaid: nextIdx > 0 ? rows[nextIdx - 1] : nextIdx < 0 ? rows[rows.length - 1] : undefined,
    contributionsRUB: { mary, dima, total: mary + dima },
    /** Сколько один должен другому, если доли 50/50 (плюс — Дима Маше). */
    equalizeRUB: (mary - dima) / 2,
    upcoming: rows.filter((r) => r.status !== 'paid' && r.due_date <= horizon),
    rateRUB,
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
