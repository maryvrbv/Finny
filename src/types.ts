// Типы строк таблиц Supabase (public.finny_*).
export type PersonId = 'mary' | 'dima' | 'joint'
export const PEOPLE: Record<PersonId, string> = { mary: 'Маша', dima: 'Дима', joint: 'Общее' }

export interface Category {
  id: string
  name: string
  emoji: string
  grp: string
  kind: 'expense' | 'income' | 'transfer'
  sort: number
}

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  title: string
  /** Минус — расход, плюс — доход. В валюте операции. */
  amount: number
  currency: string
  category_id: string
  who: PersonId
  account: string | null
  note: string | null
  /** Откуда взяли: «видео 1, Т-Банк» и т.п. */
  source: string | null
  /** Метка «нужно уточнить». */
  needs_review: boolean
}

export interface Rate {
  currency: string
  /** Сколько рублей стоит 1 единица валюты. */
  rub: number
  updated_at?: string
}

export interface BudgetLine {
  id: string
  kind: 'income' | 'savings' | 'expense'
  title: string
  who: PersonId
  category_id: string | null
  monthly_rub: number
  sort: number
}

export interface Property {
  id: string
  name: string
  developer: string | null
  unit: string | null
  owner: string | null
  price_aed: number
  booking_date: string | null
  handover_date: string | null
  escrow_bank: string | null
  monthly_savings_rub: number
  planning_rate_rub: number
  fees: { title: string; amountAED: number }[]
}

export interface Installment {
  n: number
  title: string
  due_date: string
  percent: number
  amount_aed: number
}

export interface DubaiPayment {
  id: string
  date: string
  bank: string | null
  aed: number
  rub_mary: number
  rub_dima: number
  note: string | null
}

export interface Member {
  email: string
  person: PersonId
  is_admin: boolean
}
