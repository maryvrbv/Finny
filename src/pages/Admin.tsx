import { useState } from 'react'
import { today, type Store } from '../lib/store'
import { PEOPLE } from '../types'
import { CrudTable } from './CrudTable'
import { useInstall } from '../lib/pwa'

const sections = [
  { id: 'app', label: '📱 Приложение' },
  { id: 'payments', label: '🏙️ Платежи за квартиру' },
  { id: 'categories', label: 'Категории' },
  { id: 'rates', label: 'Курсы валют' },
  { id: 'budget', label: 'План бюджета' },
  { id: 'property', label: 'Квартира и график' },
  { id: 'members', label: 'Доступ' },
] as const

const people = Object.entries(PEOPLE).map(([value, label]) => ({ value, label }))

export default function Admin({ store }: { store: Store }) {
  const [sec, setSec] = useState<(typeof sections)[number]['id']>('app')
  const { data } = store
  const catOptions = data.categories.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }))
  const used = new Set([...data.transactions.map((t) => t.category_id), ...data.budget.map((b) => b.category_id)])

  return (
    <>
      <div className="toolbar"><h1>⚙️ Настройки</h1></div>
      <div className="subnav">
        {sections.map((s) => (
          <button key={s.id} className={sec === s.id ? '' : 'ghost'} onClick={() => setSec(s.id)}>{s.label}</button>
        ))}
      </div>
      <p className="muted small">Изменения сохраняются сразу при выходе из поля. Всё хранится в Supabase.</p>

      <section className="card">
        {sec === 'app' && <AppSection />}

        {sec === 'payments' && (
          <>
            <h2>Фактические платежи за квартиру</h2>
            <p className="muted small">AED — сколько ушло застройщику; Маша ₽ / Дима ₽ — кто сколько внёс рублями. График «оплачено до…» пересчитается сам.</p>
            <CrudTable
              rows={[...data.payments].reverse()}
              rowKey="id"
              cols={[
                { field: 'date', label: 'Дата', type: 'date', required: true },
                { field: 'bank', label: 'Как платили' },
                { field: 'aed', label: 'AED', type: 'number', required: true },
                { field: 'rub_mary', label: 'Маша ₽', type: 'number' },
                { field: 'rub_dima', label: 'Дима ₽', type: 'number' },
                { field: 'note', label: 'Комментарий', width: '30%' },
              ]}
              defaults={{ date: today(), bank: '', aed: null, rub_mary: 0, rub_dima: 0, note: '' }}
              onCreate={(r) => store.insert('finny_dubai_payments', r)}
              onUpdate={(id, p) => store.update('finny_dubai_payments', 'id', id, p)}
              onDelete={(id) => store.remove('finny_dubai_payments', 'id', id)}
            />
          </>
        )}

        {sec === 'categories' && (
          <>
            <h2>Категории</h2>
            <p className="muted small">Удалить можно только категорию, которая нигде не используется. ID — латиницей, менять нельзя.</p>
            <CrudTable
              rows={data.categories}
              rowKey="id"
              cols={[
                { field: 'emoji', label: '', width: '4em' },
                { field: 'name', label: 'Название', required: true },
                { field: 'grp', label: 'Группа', required: true },
                { field: 'kind', label: 'Тип', type: 'select', required: true, options: [
                  { value: 'expense', label: 'Расход' }, { value: 'income', label: 'Доход' }, { value: 'transfer', label: 'Перевод' }] },
                { field: 'sort', label: 'Порядок', type: 'number', width: '6em' },
                { field: 'id', label: 'ID', required: true, readonlyExisting: true },
              ]}
              defaults={{ emoji: '📦', name: '', grp: 'Прочее', kind: 'expense', sort: data.categories.length, id: '' }}
              onCreate={(r) => store.insert('finny_categories', r)}
              onUpdate={(id, p) => store.update('finny_categories', 'id', id, p)}
              onDelete={(id) => (used.has(id) ? (alert('Категория используется — сначала перенеси операции/статьи.'), false) : store.remove('finny_categories', 'id', id))}
            />
          </>
        )}

        {sec === 'rates' && (
          <>
            <h2>Курсы валют к рублю</h2>
            <p className="muted small">Сколько рублей за 1 единицу валюты. Используются для пересчёта трат и прогноза по квартире.</p>
            <CrudTable
              rows={data.rateRows}
              rowKey="currency"
              cols={[
                { field: 'currency', label: 'Валюта', required: true, readonlyExisting: true },
                { field: 'rub', label: '₽ за 1', type: 'number', required: true },
              ]}
              defaults={{ currency: '', rub: null }}
              onCreate={(r) => store.insert('finny_rates', { ...r, currency: String(r.currency).toUpperCase() })}
              onUpdate={(id, p) => store.update('finny_rates', 'currency', id, { ...p, updated_at: new Date().toISOString() })}
              onDelete={(id) => (id === 'RUB' ? false : store.remove('finny_rates', 'currency', id))}
            />
          </>
        )}

        {sec === 'budget' && (
          <>
            <h2>План бюджета (в месяц)</h2>
            <CrudTable
              rows={data.budget}
              rowKey="id"
              cols={[
                { field: 'kind', label: 'Тип', type: 'select', required: true, options: [
                  { value: 'income', label: 'Доход' }, { value: 'savings', label: 'Накопления' }, { value: 'expense', label: 'Расход' }] },
                { field: 'title', label: 'Статья', required: true },
                { field: 'who', label: 'Кто', type: 'select', required: true, options: people },
                { field: 'category_id', label: 'Категория', type: 'select', options: catOptions },
                { field: 'monthly_rub', label: '₽ в месяц', type: 'number', required: true },
                { field: 'sort', label: 'Порядок', type: 'number', width: '6em' },
              ]}
              defaults={{ kind: 'expense', title: '', who: 'joint', category_id: 'other', monthly_rub: null, sort: data.budget.length }}
              onCreate={(r) => store.insert('finny_budget', r)}
              onUpdate={(id, p) => store.update('finny_budget', 'id', id, p)}
              onDelete={(id) => store.remove('finny_budget', 'id', id)}
            />
          </>
        )}

        {sec === 'property' && data.property && (
          <>
            <h2>Параметры квартиры</h2>
            <CrudTable
              rows={[data.property]}
              rowKey="id"
              cols={[
                { field: 'name', label: 'Название' },
                { field: 'price_aed', label: 'Цена AED', type: 'number' },
                { field: 'booking_date', label: 'Бронь', type: 'date' },
                { field: 'handover_date', label: 'Сдача', type: 'date' },
                { field: 'monthly_savings_rub', label: 'Копим ₽/мес', type: 'number' },
                { field: 'planning_rate_rub', label: 'Плановый курс', type: 'number' },
              ]}
              defaults={{}}
              onUpdate={(id, p) => store.update('finny_property', 'id', id, p)}
            />
            <h2 className="mt">График застройщика</h2>
            <CrudTable
              rows={data.plan}
              rowKey="n"
              cols={[
                { field: 'n', label: '#', type: 'number', required: true, readonlyExisting: true, width: '4em' },
                { field: 'due_date', label: 'Дата', type: 'date', required: true },
                { field: 'title', label: 'Этап', required: true },
                { field: 'percent', label: '%', type: 'number', required: true },
                { field: 'amount_aed', label: 'AED', type: 'number', required: true },
              ]}
              defaults={{ n: (data.plan.at(-1)?.n ?? 0) + 1, due_date: '', title: '', percent: null, amount_aed: null }}
              onCreate={(r) => store.insert('finny_dubai_plan', r)}
              onUpdate={(id, p) => store.update('finny_dubai_plan', 'n', id, p)}
              onDelete={(id) => store.remove('finny_dubai_plan', 'n', id)}
            />
          </>
        )}

        {sec === 'members' && (
          <>
            <h2>Кто имеет доступ</h2>
            <p className="muted small">
              Войти могут только эти email. Чтобы добавить Диму: добавь его email здесь, а пароль для него создаётся в Supabase
              (Authentication → Users → Add user) — или попроси Claude.
            </p>
            <CrudTable
              rows={data.members}
              rowKey="email"
              cols={[
                { field: 'email', label: 'Email', required: true, readonlyExisting: true },
                { field: 'person', label: 'Кто это', type: 'select', required: true, options: people },
                { field: 'is_admin', label: 'Админ', type: 'checkbox' },
              ]}
              defaults={{ email: '', person: 'dima', is_admin: false }}
              onCreate={(r) => store.insert('finny_members', { ...r, email: String(r.email).trim().toLowerCase() })}
              onUpdate={(id, p) => store.update('finny_members', 'email', id, p)}
              onDelete={(id) => store.remove('finny_members', 'email', id)}
            />
          </>
        )}
      </section>
    </>
  )
}

function AppSection() {
  const pwa = useInstall()
  return (
    <>
      <h2>Установить Finny на телефон или компьютер</h2>
      {pwa.installed ? (
        <p>✓ Приложение уже установлено — вы сейчас в нём.</p>
      ) : pwa.canPrompt ? (
        <>
          <p className="muted small">Finny появится на экране «Домой» как отдельное приложение, без адресной строки браузера.</p>
          <button className="big" onClick={() => pwa.install()}>📲 Установить приложение</button>
        </>
      ) : pwa.ios ? (
        <ol className="steps">
          <li>Откройте Finny в <b>Safari</b>.</li>
          <li>Нажмите кнопку <b>«Поделиться»</b> (квадрат со стрелкой вверх).</li>
          <li>Выберите <b>«На экран „Домой“»</b> и нажмите <b>«Добавить»</b>.</li>
        </ol>
      ) : (
        <>
          <button className="big" disabled>📲 Установить приложение</button>
          <p className="muted small">
            Браузер пока не предложил установку. В Chrome/Edge откройте меню ⋮ → «Установить приложение»
            (или «Добавить на главный экран» на Android). Кнопка станет активной, как только браузер будет готов.
          </p>
        </>
      )}
    </>
  )
}
