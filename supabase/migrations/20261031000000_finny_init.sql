-- Finny: семейный учёт финансов. Все объекты с префиксом finny_ (живут в проекте Supabase «Job»).
-- Применено через Supabase MCP: finny_init + finny_revoke_public_exec.

create table public.finny_members (
  email text primary key,
  person text not null check (person in ('mary','dima','joint')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.finny_is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.finny_members m where m.email = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.finny_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.finny_members m where m.email = lower(auth.jwt() ->> 'email') and m.is_admin);
$$;

create table public.finny_categories (
  id text primary key,
  name text not null,
  emoji text not null default '📦',
  grp text not null default 'Прочее',
  kind text not null default 'expense' check (kind in ('expense','income','transfer')),
  sort int not null default 0
);

create table public.finny_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  amount numeric(14,2) not null,
  currency text not null default 'RUB',
  category_id text not null references public.finny_categories(id) on update cascade,
  who text not null default 'joint' check (who in ('mary','dima','joint')),
  account text,
  note text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text default (auth.jwt() ->> 'email')
);
create index finny_transactions_date_idx on public.finny_transactions (date desc);
create index finny_transactions_category_idx on public.finny_transactions (category_id);

create table public.finny_rates (
  currency text primary key,
  rub numeric(14,6) not null,
  updated_at timestamptz not null default now()
);

create table public.finny_budget (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income','savings','expense')),
  title text not null,
  who text not null default 'joint' check (who in ('mary','dima','joint')),
  category_id text references public.finny_categories(id) on update cascade,
  monthly_rub numeric(14,2) not null,
  sort int not null default 0
);

create table public.finny_property (
  id text primary key default 'dubai',
  name text not null,
  developer text,
  unit text,
  owner text,
  price_aed numeric(14,2) not null,
  booking_date date,
  handover_date date,
  escrow_bank text,
  monthly_savings_rub numeric(14,2),
  planning_rate_rub numeric(10,4),
  fees jsonb not null default '[]'
);

create table public.finny_dubai_plan (
  n int primary key,
  title text not null,
  due_date date not null,
  percent numeric(6,2) not null,
  amount_aed numeric(14,2) not null
);

create table public.finny_dubai_payments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  bank text,
  aed numeric(14,2) not null,
  rub_mary numeric(14,2) not null default 0,
  rub_dima numeric(14,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.finny_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger finny_transactions_touch before update on public.finny_transactions
  for each row execute function public.finny_touch();

-- RLS: доступ только участникам Finny; таблицу участников меняют только админы.
do $$
declare t text;
begin
  foreach t in array array['finny_categories','finny_transactions','finny_rates','finny_budget',
                           'finny_property','finny_dubai_plan','finny_dubai_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy "finny members read" on public.%I for select to authenticated using ((select public.finny_is_member()))', t);
    execute format('create policy "finny members insert" on public.%I for insert to authenticated with check ((select public.finny_is_member()))', t);
    execute format('create policy "finny members update" on public.%I for update to authenticated using ((select public.finny_is_member())) with check ((select public.finny_is_member()))', t);
    execute format('create policy "finny members delete" on public.%I for delete to authenticated using ((select public.finny_is_member()))', t);
  end loop;
end $$;

alter table public.finny_members enable row level security;
revoke all on public.finny_members from anon;
create policy "finny members read" on public.finny_members for select to authenticated using ((select public.finny_is_member()));
create policy "finny admins write" on public.finny_members for all to authenticated
  using ((select public.finny_is_admin())) with check ((select public.finny_is_admin()));

revoke execute on function public.finny_is_member() from public, anon;
revoke execute on function public.finny_is_admin() from public, anon;
grant execute on function public.finny_is_member() to authenticated;
grant execute on function public.finny_is_admin() to authenticated;
revoke execute on function public.finny_touch() from public, anon, authenticated;

-- Участники (логин family@finny.local создан отдельно, пароль в git не хранится).
insert into public.finny_members (email, person, is_admin) values
  ('maryvrbv@gmail.com', 'mary', true),
  ('family@finny.local', 'joint', true);
