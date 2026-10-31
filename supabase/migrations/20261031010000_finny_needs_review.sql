-- Метка «нужно уточнить» у операций + категория процентов по вкладам.
alter table public.finny_transactions add column needs_review boolean not null default false;
create index finny_transactions_review_idx on public.finny_transactions (needs_review) where needs_review;
insert into public.finny_categories (id,name,emoji,grp,kind,sort) values ('interest','Проценты по вкладам','📈','Доходы','income',21) on conflict (id) do nothing;
insert into public.finny_categories (id,name,emoji,grp,kind,sort) values ('pets','Питомцы','🐱','Дом','expense',12) on conflict (id) do nothing;
insert into public.finny_categories (id,name,emoji,grp,kind,sort) values ('cleaning','Уборка','🧹','Жильё','expense',3) on conflict (id) do nothing;
