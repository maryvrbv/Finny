import { fmt, today, type Store } from '../lib/store'
import { dubaiSummary, monthsBetween, type InstallmentStatus } from '../lib/dubai'
import { BarList, Progress, Stat } from './ui'

const statusLabel: Record<InstallmentStatus, string> = {
  paid: '✓ Оплачен',
  partial: '◐ Частично',
  due: '● Скоро',
  overdue: '! Просрочен',
  upcoming: '○ Впереди',
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const aed = (v: number) => fmt(v, 'AED')
const rub = (v: number) => fmt(v)

export default function Dubai({ store }: { store: Store }) {
  const { property: p, plan, payments, rates } = store.data
  if (!p) return <p className="muted">Квартира не заведена.</p>
  const s = dubaiSummary(p, plan, payments, rates.AED)
  const now = today()

  let need = 0
  const forecast = s.upcoming.map((r) => {
    need += (r.amount_aed - r.paidAED) * p.planning_rate_rub
    const saved = Math.max(0, monthsBetween(now, r.due_date)) * p.monthly_savings_rub
    return { ...r, needCum: need, savedCum: saved }
  })

  return (
    <>
      <div className="toolbar">
        <h1>🏙️ {p.name}</h1>
        <a className="button-link" href="#admin">+ Внести платёж</a>
      </div>
      <p className="muted">
        {p.unit} · {p.developer} · собственник {p.owner} · бронь {date(p.booking_date)} · сдача {date(p.handover_date)}
      </p>

      <section className="stats">
        <Stat label="Цена" value={aed(p.price_aed)} sub={`+ сборы ${aed(s.feesAED)}`} />
        <Stat label="Оплачено по графику" value={aed(s.paidToPlanAED)} sub={`${s.paidPercent.toFixed(0)}% цены`} />
        <Stat className="wide accent" label="Осталось" value={aed(s.remainingAED)} sub={`≈ ${rub(s.remainingAED * s.rateRUB)} по курсу ${s.rateRUB}`} />
        <Stat
          label="Опережение графика"
          value={aed(Math.max(0, s.aheadOfScheduleAED))}
          sub={s.next ? (s.lastPaid ? `оплачено до ${date(s.lastPaid.due_date)} включительно` : '') : 'всё оплачено 🎉'}
        />
      </section>

      <section className="card">
        <h2>Прогресс оплаты</h2>
        <Progress value={s.paidPercent} label="Оплачено от цены квартиры" />
        <div className="muted small">{s.paidPercent.toFixed(1)}% · последний платёж по графику {date(plan[plan.length - 1]?.due_date ?? null)}</div>
      </section>

      <div className="grid2">
        <section className="card">
          <h2>Кто сколько внёс</h2>
          <BarList
            rows={[
              { key: 'mary', label: 'Маша', value: s.contributionsRUB.mary },
              { key: 'dima', label: 'Дима', value: s.contributionsRUB.dima },
            ]}
            format={rub}
          />
          <p className="small">
            Всего {rub(s.contributionsRUB.total)} за {aed(s.paidAED)} (средний курс {(s.contributionsRUB.total / s.paidAED).toFixed(2)} ₽/AED).
            {' '}Разница вкладов {rub(Math.abs(s.contributionsRUB.mary - s.contributionsRUB.dima))};
            при долях 50/50 {s.equalizeRUB > 0 ? 'Дима должен Маше' : 'Маша должна Диме'} <b>{rub(Math.abs(s.equalizeRUB))}</b>.
          </p>
        </section>

        <section className="card table-wrap">
          <h2>Ближайшие 12 месяцев</h2>
          <p className="muted small">
            Нужно по плановому курсу {p.planning_rate_rub} ₽/AED vs накопится при {rub(p.monthly_savings_rub)}/мес с сегодняшнего дня (без учёта текущих остатков).
          </p>
          <table>
            <thead><tr><th>Дата</th><th className="num">AED</th><th className="num">Нужно</th><th className="num">Накопится</th></tr></thead>
            <tbody>
              {forecast.map((r) => (
                <tr key={r.n}>
                  <td className="nowrap">{date(r.due_date)} <span className="muted small hide-sm">{r.percent}%</span></td>
                  <td className="num">{aed(r.amount_aed - r.paidAED)}</td>
                  <td className="num">{rub(r.needCum)}</td>
                  <td className={'num ' + (r.savedCum < r.needCum ? 'warn' : 'ok')}>{r.savedCum < r.needCum ? '! ' : '✓ '}{rub(r.savedCum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card table-wrap">
        <h2>Фактические платежи</h2>
        <table>
          <thead><tr><th>Дата</th><th className="hide-sm">Как</th><th className="hide-sm">Комментарий</th><th className="num">AED</th><th className="num">Маша ₽</th><th className="num">Дима ₽</th></tr></thead>
          <tbody>
            {payments.map((x) => (
              <tr key={x.id}>
                <td className="nowrap">{date(x.date)}</td><td className="hide-sm">{x.bank}</td><td className="small hide-sm">{x.note}</td>
                <td className="num">{aed(x.aed)}</td><td className="num">{rub(x.rub_mary)}</td><td className="num">{rub(x.rub_dima)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td>Итого</td><td className="hide-sm" /><td className="hide-sm" /><td className="num">{aed(s.paidAED)}</td><td className="num">{rub(s.contributionsRUB.mary)}</td><td className="num">{rub(s.contributionsRUB.dima)}</td></tr>
          </tfoot>
        </table>
      </section>

      <section className="card table-wrap">
        <h2>График застройщика ({plan.length} платежей)</h2>
        <table>
          <thead><tr><th>#</th><th>Дата</th><th className="hide-sm">Этап</th><th className="num">%</th><th className="num">AED</th><th className="num hide-sm">Нарастающим</th><th>Статус</th></tr></thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.n} className={r === s.next ? 'highlight' : r.status === 'paid' ? 'dim' : ''}>
                <td>{r.n}</td>
                <td className="nowrap">{date(r.due_date)}</td>
                <td className="small hide-sm">{r.title}</td>
                <td className="num">{r.percent}%</td>
                <td className="num">{aed(r.amount_aed)}</td>
                <td className="num muted hide-sm">{aed(r.cumulativeAED)}</td>
                <td className={'status-' + r.status + ' nowrap'}>{statusLabel[r.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
