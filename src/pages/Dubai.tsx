import { dubai, fmt } from '../lib/store'
import { dubaiSummary, monthsBetween, type InstallmentStatus } from '../lib/dubai'
import { BarList, Progress, Stat } from './ui'

const statusLabel: Record<InstallmentStatus, string> = {
  paid: '✓ Оплачен',
  partial: '◐ Частично',
  due: '● Скоро',
  overdue: '! Просрочен',
  upcoming: '○ Впереди',
}

const date = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
const aed = (v: number) => fmt(v, 'AED')
const rub = (v: number) => fmt(v, '₽')

export default function Dubai() {
  const s = dubaiSummary()
  const now = new Date().toISOString().slice(0, 10)

  // Хватит ли накоплений (350 000 ₽/мес начиная с сегодня) на платежи следующих 12 месяцев.
  let need = 0
  const forecast = s.upcoming.map((r) => {
    need += (r.amountAED - r.paidAED) * dubai.planningRateRUB
    const saved = Math.max(0, monthsBetween(now, r.dueDate)) * dubai.monthlySavingsRUB
    return { ...r, needCumRUB: need, savedCumRUB: saved }
  })

  return (
    <>
      <div className="toolbar">
        <h1>🏙️ {dubai.name}</h1>
      </div>
      <p className="muted">
        {dubai.unit} · {dubai.developer} · собственник {dubai.owner} · бронь {date(dubai.bookingDate)} · сдача {date(dubai.handoverDate)}
      </p>

      <section className="stats">
        <Stat label="Цена" value={aed(dubai.priceAED)} sub={`+ сборы ${aed(s.feesAED)}`} />
        <Stat label="Оплачено по графику" value={aed(s.paidToPlanAED)} sub={`${s.paidPercent.toFixed(0)}% цены`} />
        <Stat label="Осталось" value={aed(s.remainingAED)} sub={`≈ ${rub(s.remainingAED * s.rateRUB)} по курсу ${s.rateRUB}`} />
        <Stat
          label="Опережение графика"
          value={aed(Math.max(0, s.aheadOfScheduleAED))}
          sub={s.next ? `оплачено до ${date(s.rows[s.rows.indexOf(s.next) - 1]?.dueDate ?? s.next.dueDate)} включительно` : 'всё оплачено 🎉'}
        />
      </section>

      <section className="card">
        <h2>Прогресс оплаты</h2>
        <Progress value={s.paidPercent} label="Оплачено от цены квартиры" />
        <div className="muted small">{s.paidPercent.toFixed(1)}% из 100% · последний платёж по графику {date(dubai.plan[dubai.plan.length - 1].dueDate)}</div>
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

        <section className="card">
          <h2>Ближайшие 12 месяцев</h2>
          <p className="muted small">
            Нужно по плановому курсу {dubai.planningRateRUB} ₽/AED vs накопится при {rub(dubai.monthlySavingsRUB)}/мес с сегодняшнего дня (без учёта текущих остатков).
          </p>
          <table>
            <thead><tr><th>Дата</th><th className="num">AED</th><th className="num">Нужно (нараст.)</th><th className="num">Накопится</th></tr></thead>
            <tbody>
              {forecast.map((r) => (
                <tr key={r.n}>
                  <td className="nowrap">{date(r.dueDate)} <span className="muted small">{r.percent}%</span></td>
                  <td className="num">{aed(r.amountAED - r.paidAED)}</td>
                  <td className="num">{rub(r.needCumRUB)}</td>
                  <td className={'num ' + (r.savedCumRUB < r.needCumRUB ? 'warn' : 'ok')}>
                    {r.savedCumRUB < r.needCumRUB ? '! ' : '✓ '}{rub(r.savedCumRUB)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card table-wrap">
        <h2>Фактические платежи</h2>
        <table>
          <thead><tr><th>Дата</th><th>Как</th><th>Комментарий</th><th className="num">AED</th><th className="num">Маша ₽</th><th className="num">Дима ₽</th></tr></thead>
          <tbody>
            {dubai.payments.map((p, i) => (
              <tr key={i}>
                <td className="nowrap">{date(p.date)}</td><td>{p.bank}</td><td className="small">{p.note}</td>
                <td className="num">{aed(p.aed)}</td><td className="num">{rub(p.rub.mary)}</td><td className="num">{rub(p.rub.dima)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Итого</td><td className="num">{aed(s.paidAED)}</td><td className="num">{rub(s.contributionsRUB.mary)}</td><td className="num">{rub(s.contributionsRUB.dima)}</td></tr>
          </tfoot>
        </table>
      </section>

      <section className="card table-wrap">
        <h2>График застройщика ({dubai.plan.length} платежей)</h2>
        <table>
          <thead><tr><th>#</th><th>Дата</th><th>Этап</th><th className="num">%</th><th className="num">AED</th><th className="num">Нарастающим</th><th>Статус</th></tr></thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.n} className={r === s.next ? 'highlight' : r.status === 'paid' ? 'dim' : ''}>
                <td>{r.n}</td>
                <td className="nowrap">{date(r.dueDate)}</td>
                <td className="small">{r.title}</td>
                <td className="num">{r.percent}%</td>
                <td className="num">{aed(r.amountAED)}</td>
                <td className="num muted">{aed(r.cumulativeAED)}</td>
                <td className={'status-' + r.status + ' nowrap'}>{statusLabel[r.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
