import { useState } from 'react'
import type { Store } from '../lib/store'
import type { Category } from '../types'

export default function Categories({ store }: { store: Store }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const [group, setGroup] = useState('Прочее')
  const update = (id: string, p: Partial<Category>) =>
    store.setCategories(store.categories.map((c) => (c.id === id ? { ...c, ...p } : c)))
  const used = new Set(store.transactions.map((t) => t.categoryId))
  const groups = [...new Set(store.categories.map((c) => c.group))]

  return (
    <>
      <div className="toolbar"><h1>Категории</h1></div>
      <form
        className="card addform"
        onSubmit={(e) => {
          e.preventDefault()
          const id = name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-') + '-' + Date.now().toString(36).slice(-3)
          store.setCategories([...store.categories, { id, name, emoji, group, kind: 'expense' }])
          setName('')
        }}
      >
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ width: '3.5em' }} aria-label="Эмодзи" />
        <input placeholder="Новая категория" value={name} onChange={(e) => setName(e.target.value)} required />
        <input list="groups" placeholder="Группа" value={group} onChange={(e) => setGroup(e.target.value)} />
        <datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        <button type="submit">+ Добавить</button>
      </form>

      {groups.map((g) => (
        <section className="card" key={g}>
          <h2>{g}</h2>
          {store.categories.filter((c) => c.group === g).map((c) => (
            <div className="catrow" key={c.id}>
              <input value={c.emoji} onChange={(e) => update(c.id, { emoji: e.target.value })} style={{ width: '3.5em' }} aria-label="Эмодзи" />
              <input value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} aria-label="Название" />
              <input list="groups" value={c.group} onChange={(e) => update(c.id, { group: e.target.value })} aria-label="Группа" />
              <span className="muted small">{c.id}</span>
              {!used.has(c.id) && (
                <button className="ghost small" onClick={() => store.setCategories(store.categories.filter((x) => x.id !== c.id))}>✕</button>
              )}
            </div>
          ))}
        </section>
      ))}
    </>
  )
}
