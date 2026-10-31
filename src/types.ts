export type Currency = 'AED' | 'RUB' | 'USD' | 'EUR' | 'USDT' | string
export type PersonId = 'mary' | 'dima' | 'joint'

export interface Settings {
  baseCurrency: Currency
  /** Сколько единиц базовой валюты стоит 1 единица валюты. */
  rates: Record<Currency, number>
  ratesDate: string
  ratesNote?: string
  people: Record<PersonId, string>
}

export interface Category {
  id: string
  name: string
  emoji: string
  group: string
  kind: 'expense' | 'income' | 'transfer'
}

export interface Account {
  id: string
  name: string
  currency: Currency
  owner: PersonId
  /** Остаток на дату balanceDate (null — неизвестно). */
  balance: number | null
  balanceDate: string | null
}

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  title: string
  /** Минус — расход, плюс — доход. В валюте операции. */
  amount: number
  currency: Currency
  categoryId: string
  accountId?: string
  who: PersonId
  note?: string
  /** Откуда взяли: «видео 1», «выписка Тинькофф» и т.п. */
  source?: string
}

export interface DubaiInstallment {
  n: number
  title: string
  dueDate: string
  percent: number
  amountAED: number
}

export interface DubaiPayment {
  date: string
  bank: string
  /** Сколько AED ушло застройщику этим платежом. */
  aed: number
  /** Сколько рублей внёс каждый. */
  rub: { mary: number; dima: number }
  note?: string
}

export interface DubaiProperty {
  name: string
  developer: string
  unit: string
  owner: string
  priceAED: number
  bookingDate: string
  handoverDate: string
  escrowBank: string
  fees: { title: string; amountAED: number }[]
  /** Сколько откладываем в месяц под квартиру. */
  monthlySavingsRUB: number
  /** Курс AED→RUB для планирования (с запасом). */
  planningRateRUB: number
  plan: DubaiInstallment[]
  payments: DubaiPayment[]
}

export interface BudgetLine {
  title: string
  categoryId: string
  who: PersonId
  monthlyRUB: number
  note?: string
}

export interface Budget {
  income: { who: PersonId; title: string; monthlyRUB: number }[]
  savings: { who: PersonId; title: string; monthlyRUB: number }[]
  expenses: BudgetLine[]
}
