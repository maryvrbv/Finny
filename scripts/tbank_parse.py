# Разбор PDF-выписки Т-Банка: pdftotext -layout statement.pdf out.txt && python3 tbank_parse.py out.txt ops.json
import re, sys, json
lines = open(sys.argv[1]).read().splitlines()
ops, cur = [], None
row = re.compile(r'^(\d\d\.\d\d\.\d{4})\s+\d\d\.\d\d\.\d{4}\s+([+-][\d ]+\.\d\d) ₽\s+[+-][\d ]+\.\d\d ₽\s+(.*?)\s{2,}(\S+)\s*$')
for l in lines:
    m = row.match(l)
    if m:
        d, a, desc, card = m.groups()
        cur = {'date': '-'.join(reversed(d.split('.'))), 'amount': float(a.replace(' ', '')), 'desc': desc.strip(), 'card': card}
        ops.append(cur); continue
    if cur and re.match(r'^\d\d:\d\d\s+\d\d:\d\d\s{2,}', l):
        cur['desc'] += ' ' + re.sub(r'^\d\d:\d\d\s+\d\d:\d\d\s+', '', l).strip(); continue
    if cur and re.match(r'^\s{40,}\S', l) and 'БИК' not in l and 'лицензия' not in l and not l.strip().isdigit():
        cur['desc'] += ' ' + l.strip(); continue
    if l.startswith('Дата и время') or 'АО «ТБанк»' in l: cur = None
print(len(ops), 'ops; in', sum(o['amount'] for o in ops if o['amount'] > 0), 'out', sum(o['amount'] for o in ops if o['amount'] < 0))
json.dump(ops, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for o in ops: print(o['date'], o['amount'], '|', o['desc'])
