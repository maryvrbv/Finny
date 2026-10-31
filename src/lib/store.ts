import { useEffect, useMemo, useState } from 'react'
import type { Account, Budget, Category, DubaiProperty, Settings, Transaction } from '../types'
import settingsJson from '../data/settings.json'
import categoriesJson from '../data/categories.json'
import accountsJson from '../data/accounts.json'
import budgetJson from "../data/budget.json"
import dubaiJson from '../data/dubai.json'

// Все месячные файлы src/data/transactions/YYYY-MM.json подтягиваются автоматически.
const monthFiles = import.meta.glob<Transaction[]>('../data/transactions/*.json', {
  eager: true,
  import: 'default',
})

export const baseTransactions: Transaction[] = Object.values(monthFiles).flat()
export const settings = settingsJson as Settings
export const accounts = accountsJson as Account[]
export const dubai = dubaiJson as DubaiProperty
export const budget = budgetJson as Budget

/**
 * Правки из интерфейса хранятся в localStorage поверх данных из git.
 * Кнопка «Экспорт» выгружает итоговый JSON, который потом коммитится в репозиторий.
 */
interface LocalState {
  edits: Record<string, Partial<Transaction>>
  added: Transaction[]
  deleted: string[]
  categories: Category[] | null
}

const KEY = 'finny:local:v1'
const empty: LocalState = { edits: {}, added: [], deleted: [], categories: null }

function load(): LocalState {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return empty
  }
}

export function useStore() {
  const [local, setLocal] = useState<LocalState>(load)
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(local)), [local])

  const categories = local.categories ?? (categoriesJson as Category[])

  const transactions = useMemo(() => {
    const deleted = new Set(local.deleted)
    return [...baseTransactions, ...local.added]
      .filter((t) => !deleted.has(t.id))
      .map((t) => ({ ...t, ...local.edits[t.id] }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [local])

  const hasLocalChanges =
    Object.keys(local.edits).length > 0 || local.added.length > 0 || local.deleted.length > 0 || !!local.categories

  return {
    categories,
    transactions,
    hasLocalChanges,
    updateTransaction: (id: string, patch: Partial<Transaction>) =>
      setLocal((s) => ({ ...s, edits: { ...s.edits, [id]: { ...s.edits[id], ...patch } } })),
    addTransaction: (t: Transaction) => setLocal((s) => ({ ...s, added: [...s.added, t] })),
    deleteTransaction: (id: string) => setLocal((s) => ({ ...s, deleted: [...s.deleted, id] })),
    setCategories: (c: Category[]) => setLocal((s) => ({ ...s, categories: c })),
    resetLocal: () => setLocal(empty),
    exportJson: () => {
      const byMonth: Record<string, Transaction[]> = {}
      for (const t of [...transactions].reverse()) (byMonth[t.date.slice(0, 7)] ??= []).push(t)
      download('finny-export.json', { categories, transactionsByMonth: byMonth })
    },
  }
}

export type Store = ReturnType<typeof useStore>

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- деньги ----------

export const toBase = (amount: number, currency: string) => amount * (settings.rates[currency] ?? NaN)

export function fmt(amount: number, currency = settings.baseCurrency, digits = 0) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(amount) +
    ' ' + currency
}

export const monthLabel = (ym: string) => {
  const s = new Date(ym + '-01T00:00:00').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return s[0].toUpperCase() + s.slice(1)
}

export const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
