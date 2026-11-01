-- Счета (карты, сейвы, вклады, крипта, рассрочки) и привязка операций к счёту.
create table public.finny_accounts (
  id text primary key,
  name text not null,
  owner text not null check (owner in ('mary','dima','joint')),
  kind text not null default 'card' check (kind in ('card','savings','deposit','cash','crypto','credit')),
  bank text,
  currency text not null default 'RUB',
  balance numeric(14,2),
  balance_date date,
  rate numeric(6,3),
  until_date date,
  note text,
  active boolean not null default true,
  sort int not null default 0
);
alter table public.finny_accounts enable row level security;
revoke all on public.finny_accounts from anon;
create policy "finny members read" on public.finny_accounts for select to authenticated using ((select public.finny_is_member()));
create policy "finny members insert" on public.finny_accounts for insert to authenticated with check ((select public.finny_is_member()));
create policy "finny members update" on public.finny_accounts for update to authenticated using ((select public.finny_is_member())) with check ((select public.finny_is_member()));
create policy "finny members delete" on public.finny_accounts for delete to authenticated using ((select public.finny_is_member()));

alter table public.finny_transactions add column account_id text references public.finny_accounts(id) on update cascade on delete set null;
create index finny_transactions_account_idx on public.finny_transactions (account_id);

-- Озон Банк пополняется с общего счёта → считается общим кошельком
-- (update finny_accounts set owner='joint' where id='ozon-mary' — выполнено в данных)
