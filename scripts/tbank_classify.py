# Раскладывает операции по категориям и генерирует SQL для finny_transactions:
# python3 tbank_classify.py ops.json classified.json insert.sql
import json, sys
ops = json.load(open(sys.argv[1]))
rules = [  # (подстрока, название, категория, заметка)
    ('Авито.Безопасная', 'Продажа на Авито', 'income-other', None),
    ('Avito Dostavka', 'Авито: выплата за сделку', 'income-other', None),
    ('Кэшбэк', 'Кэшбэк Т-Банк', 'income-other', None),
    ('MPC_internet', 'Интернет (MPC)', 'utilities', None),
    ('Снятие наличных', 'Снятие наличных', 'transfer', 'Наличные — на что потрачены? (перед этим пришло 142 000 по СБП)'),
    ('Внутренний перевод на договор', 'Перевод на свой счёт/вклад', 'transfer', None),
    ('Перевод с договора', 'Перевод со своего счёта', 'transfer', None),
    ('GROWFOOD', 'Growfood', 'delivery', None),
    ('Growfood', 'Growfood', 'delivery', None),
    ('WINLINE', 'Winline', 'entertainment', None),
    ('IVI.RU', 'Иви', 'subscriptions', None),
    ('CLOUD.RU', 'Cloud.ru', 'subscriptions', None),
    ('FLAUVAU', 'Flowwow (цветы)', 'gifts', None),
    ('BYUTIVEJ KLINIK', 'Бьюти-клиника', 'beauty', None),
    ('HELLO DOC', 'Hello Doc', 'health', None),
    ('Aliexpress', 'AliExpress', 'home', None),
    ('SPORTMASTER', 'Спортмастер', 'sport', None),
    ('USMALL', 'USMALL (Зеленоград)', 'clothes', 'Категория предположительная'),
    ('T-Bank.T- Bundle', 'Подписка T-Bundle', 'subscriptions', None),
    ('Аптека', 'Аптека', 'health', None),
    ('upsushi', 'UP Sushi (доставка)', 'delivery', None),
    ('T- Mobile', 'Т-Мобайл (связь)', 'utilities', None),
    ('VKUSVILL', 'ВкусВилл', 'groceries', None),
    ('УФК по Тульской', 'Платёж в казначейство (УФК Тульская обл.)', 'fees', 'Налог/штраф/пошлина — уточнить'),
    ('Внешний перевод по номеру телефона', 'Перевод на свой счёт в другом банке', 'transfer', None),
]
out = []
for i, o in enumerate(ops):
    d = o['desc']
    if d.startswith('Пополнение. Система быстрых платежей'):
        # пары «пришло → сразу ушло на договор» — переводы между своими счетами
        pair = any(p['date'] == o['date'] and p['amount'] == -o['amount'] and 'договор' in p['desc'] or
                   (p['date'] == o['date'] and 'Снятие наличных' in p['desc']) for p in ops)
        if pair: t = ('Пополнение по СБП (свой счёт)', 'transfer', None)
        elif o['amount'] == 2990: t = ('Возврат половины за интернет', 'utilities', 'Пришло сразу после оплаты интернета 5 980 ₽ — похоже, вторая половина')
        else: t = ('Пополнение по СБП', 'income-other', 'От кого? Уточнить')
    else:
        t = next(((n, c, note) for s, n, c, note in rules if s in d), None)
        if not t: sys.exit('no rule: ' + d)
    out.append({'date': o['date'], 'title': t[0], 'amount': o['amount'], 'category_id': t[1], 'note': t[2],
                'raw': d, 'card': o['card']})
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
from collections import defaultdict
agg = defaultdict(float)
for r in out: agg[r['category_id']] += r['amount']
for k, v in sorted(agg.items(), key=lambda x: x[1]): print(f'{k:15} {v:12,.0f}')
q = lambda v: 'null' if v is None else "'" + str(v).replace("'", "''") + "'"
vals = ',\n'.join(f"({q(r['date'])},{q(r['title'])},{r['amount']},'RUB',{q(r['category_id'])},{q('mary' if r['category_id'] in ('transfer','income-other') else 'joint')},'Т-Банк Маша',{q(r['note'])},{q('Т-Банк, выписка за октябрь 2026, карта *' + r['card'] + ': ' + r['raw'])})" for r in out)
open(sys.argv[3], 'w').write('insert into public.finny_transactions (date,title,amount,currency,category_id,who,account,note,source) values\n' + vals + ';')
