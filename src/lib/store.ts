import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Account, BudgetLine, Category, DubaiPayment, Installment, Member, Property, Rate, Transaction } from '../types'

export interface Data {
  categories: Category[]
  transactions: Transaction[]
  rates: Record<string, number>
  rateRows: Rate[]
  budget: BudgetLine[]
  property: Property | null
  plan: Installment[]
  payments: DubaiPayment[]
  members: Member[]
  accounts: Account[]
}

const num = <T,>(rows: T[], keys: (keyof T)[]): T[] =>
  rows.map((r) => {
    const o = { ...r }
    for (const k of keys) if (o[k] != null) (o as Record<keyof T, unknown>)[k] = Number(o[k])
    return o
  })

async function q<T>(p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data ?? []
}

async function loadAll(): Promise<Data> {
  const [categories, transactions, rateRows, budget, property, plan, payments, members, accounts] = await Promise.all([
    q<Category>(supabase.from('finny_categories').select('*').order('sort')),
    q<Transaction>(supabase.from('finny_transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })),
    q<Rate>(supabase.from('finny_rates').select('*').order('currency')),
    q<BudgetLine>(supabase.from('finny_budget').select('*').order('sort')),
    q<Property>(supabase.from('finny_property').select('*').eq('id', 'dubai')),
    q<Installment>(supabase.from('finny_dubai_plan').select('*').order('n')),
    q<DubaiPayment>(supabase.from('finny_dubai_payments').select('*').order('date')),
    q<Member>(supabase.from('finny_members').select('email,person,is_admin').order('email')),
    q<Account>(supabase.from('finny_accounts').select('*').order('sort')),
  ])
  const rates = num(rateRows, ['rub'])
  const prop = num(property, ['price_aed', 'monthly_savings_rub', 'planning_rate_rub'])[0] ?? null
  return {
    categories,
    transactions: num(transactions, ['amount']),
    rateRows: rates,
    rates: Object.fromEntries(rates.map((r) => [r.currency, r.rub])),
    budget: num(budget, ['monthly_rub']),
    property: prop,
    plan: num(plan, ['percent', 'amount_aed']),
    payments: num(payments, ['aed', 'rub_mary', 'rub_dima']),
    members,
    accounts: num(accounts, ['balance', 'rate']),
  }
}

type Table =
  | 'finny_categories' | 'finny_transactions' | 'finny_rates' | 'finny_budget'
  | 'finny_property' | 'finny_dubai_plan' | 'finny_dubai_payments' | 'finny_members' | 'finny_accounts'

const tableField: Record<Table, keyof Data> = {
  finny_categories: 'categories',
  finny_transactions: 'transactions',
  finny_rates: 'rateRows',
  finny_budget: 'budget',
  finny_property: 'property',
  finny_dubai_plan: 'plan',
  finny_dubai_payments: 'payments',
  finny_members: 'members',
  finny_accounts: 'accounts',
}

export function useStore() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    try {
      setData(await loadAll())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  /** Обёртка для записи: показывает ошибку и перезагружает данные. */
  const write = useCallback(
    async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      setSaving(true)
      const { error } = await fn()
      setSaving(false)
      if (error) {
        alert('Не удалось сохранить: ' + error.message)
        return false
      }
      await reload()
      return true
    },
    [reload],
  )

  const insert = (t: Table, row: object) => write(() => supabase.from(t).insert(row))
  const remove = (t: Table, key: string, id: string | number) => {
    patchLocal(t, (rows) => rows.filter((r) => String(r[key]) !== String(id)))
    return write(() => supabase.from(t).delete().eq(key, id))
  }
  /** Оптимистично: сразу меняем локально, потом сохраняем и сверяемся с базой. */
  const update = (t: Table, key: string, id: string | number, patch: object) => {
    patchLocal(t, (rows) => rows.map((r) => (String(r[key]) === String(id) ? { ...r, ...patch } : r)))
    return write(() => supabase.from(t).update(patch).eq(key, id))
  }

  function patchLocal(t: Table, fn: (rows: Record<string, unknown>[]) => Record<string, unknown>[]) {
    const field = tableField[t]
    setData((d) => {
      if (!d) return d
      if (field === 'property') return d.property ? { ...d, property: fn([d.property as never])[0] as never } : d
      return { ...d, [field]: fn(d[field] as never) }
    })
  }

  return {
    data,
    error,
    saving,
    reload,
    insert,
    update,
    remove,
    toRub: (amount: number, currency: string) => amount * (data?.rates[currency] ?? NaN),
  }
}

export type Store = ReturnType<typeof useStore> & { data: Data }

// ---------- форматирование ----------

export function fmt(amount: number, currency = '₽', digits = 0) {
  if (!Number.isFinite(amount)) return '—'
  amount = amount + 0 // убираем «-0»
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(amount) + ' ' + currency
}

export const monthLabel = (ym: string) => {
  const s = new Date(ym + '-01T00:00:00').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return s[0].toUpperCase() + s.slice(1)
}

export const today = () => new Date().toISOString().slice(0, 10)

/** Фильтр по счёту: '' — все, 'owner:mary|dima|joint' — группа, иначе id счёта. */
export function matchAccount(filter: string, accountId: string | null, accounts: Account[]) {
  if (!filter) return true
  if (filter.startsWith('owner:')) {
    const owner = filter.slice(6)
    return accounts.find((a) => a.id === accountId)?.owner === owner
  }
  return accountId === filter
}
