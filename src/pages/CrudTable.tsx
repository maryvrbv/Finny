import { useState } from 'react'

export interface Col {
  field: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'checkbox'
  options?: { value: string; label: string }[]
  width?: string
  required?: boolean
  /** Нельзя менять у существующих строк (например, первичный ключ). */
  readonlyExisting?: boolean
}

type Row = Record<string, unknown>

/**
 * Редактируемая таблица: каждая ячейка сохраняется в базу при уходе с поля,
 * сверху — форма добавления новой строки.
 */
export function CrudTable({
  rows, rowKey, cols, defaults, onCreate, onUpdate, onDelete, addLabel = '+ Добавить',
}: {
  rows: object[]
  rowKey: string
  cols: Col[]
  defaults: Row
  onCreate?: (row: Row) => Promise<boolean>
  onUpdate: (id: string, patch: Row) => Promise<boolean>
  onDelete?: (id: string, row: Row) => Promise<boolean> | false
  addLabel?: string
}) {
  const [draft, setDraft] = useState<Row>(defaults)

  return (
    <div className="table-wrap">
      <table className="crud">
        <thead>
          <tr>
            {cols.map((c) => <th key={c.field} className={c.type === 'number' ? 'num' : ''} style={{ width: c.width }}>{c.label}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {onCreate && (
            <tr className="newrow">
              {cols.map((c) => (
                <td key={c.field}>
                  <Field col={c} value={draft[c.field]} onChange={(v) => setDraft((d) => ({ ...d, [c.field]: v }))} live />
                </td>
              ))}
              <td>
                <button
                  className="small"
                  onClick={async () => {
                    const missing = cols.find((c) => c.required && (draft[c.field] === '' || draft[c.field] == null))
                    if (missing) return alert(`Заполни поле «${missing.label}»`)
                    if (await onCreate(draft)) setDraft(defaults)
                  }}
                >{addLabel}</button>
              </td>
            </tr>
          )}
          {(rows as Row[]).map((r) => {
            const id = String(r[rowKey])
            return (
              <tr key={id}>
                {cols.map((c) => (
                  <td key={c.field}>
                    {c.readonlyExisting ? (
                      <span className="muted small">{String(r[c.field] ?? '')}</span>
                    ) : (
                      <Field col={c} value={r[c.field]} onChange={(v) => v !== r[c.field] && onUpdate(id, { [c.field]: v })} />
                    )}
                  </td>
                ))}
                <td>
                  {onDelete && (
                    <button className="ghost small" title="Удалить" onClick={() => confirm('Удалить строку?') && onDelete(id, r)}>✕</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Field({ col, value, onChange, live }: { col: Col; value: unknown; onChange: (v: unknown) => void; live?: boolean }) {
  const parse = (s: string) => (col.type === 'number' ? (s === '' ? null : Number(s)) : s === '' && !col.required ? null : s)
  if (col.type === 'checkbox')
    return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
  if (col.type === 'select')
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}>
        {!col.required && <option value="">—</option>}
        {col.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  const common = {
    className: 'inline' + (col.type === 'number' ? ' num' : ''),
    type: col.type ?? 'text',
    step: col.type === 'number' ? 'any' : undefined,
    placeholder: col.label,
  }
  return live ? (
    <input {...common} value={String(value ?? '')} onChange={(e) => onChange(parse(e.target.value))} />
  ) : (
    <input {...common} key={String(value)} defaultValue={String(value ?? '')} onBlur={(e) => onChange(parse(e.target.value))} />
  )
}
