-- Plantilla Finanzas: schema, defaults, triggers and RLS policies.
create extension if not exists "pgcrypto";

create type public.workspace_type as enum ('personal', 'shared');
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.account_type as enum ('cash', 'bank', 'wallet', 'other');
create type public.currency_code as enum ('ARS', 'USD');
create type public.movement_type as enum ('income', 'expense', 'transfer');
create type public.category_kind as enum ('income', 'expense');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  type public.workspace_type not null default 'shared',
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member' check (role in ('admin', 'member')),
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (workspace_id, email, status)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  type public.account_type not null default 'other',
  currency public.currency_code not null default 'ARS',
  initial_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  kind public.category_kind not null,
  color text not null default '#0f766e' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, kind, name)
);

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type public.movement_type not null,
  amount numeric(14,2) not null check (amount > 0),
  currency public.currency_code not null,
  date date not null default current_date,
  account_id uuid not null references public.accounts(id) on delete restrict,
  transfer_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  description text check (description is null or char_length(description) <= 240),
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type = 'transfer' and transfer_account_id is not null) or (type <> 'transfer' and transfer_account_id is null))
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  currency public.currency_code not null default 'ARS',
  target_date date,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index idx_accounts_workspace_currency on public.accounts(workspace_id, currency);
create index idx_categories_workspace_kind on public.categories(workspace_id, kind);
create index idx_movements_workspace_date on public.movements(workspace_id, date desc);
create index idx_movements_account on public.movements(account_id);
create index idx_goals_workspace_currency on public.savings_goals(workspace_id, currency);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_workspaces before update on public.workspaces for each row execute function public.touch_updated_at();
create trigger touch_accounts before update on public.accounts for each row execute function public.touch_updated_at();
create trigger touch_categories before update on public.categories for each row execute function public.touch_updated_at();
create trigger touch_movements before update on public.movements for each row execute function public.touch_updated_at();
create trigger touch_savings_goals before update on public.savings_goals for each row execute function public.touch_updated_at();

create or replace function public.is_workspace_member(target_workspace uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = target_user);
$$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[], target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = target_user and role = any(allowed_roles));
$$;

create or replace function public.seed_workspace_defaults(target_workspace uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (workspace_id, name, type, currency, initial_balance, current_balance, is_active) values
    (target_workspace, 'Efectivo', 'cash', 'ARS', 0, 0, true),
    (target_workspace, 'Banco', 'bank', 'ARS', 0, 0, true),
    (target_workspace, 'Mercado Pago', 'wallet', 'ARS', 0, 0, true)
  on conflict do nothing;

  insert into public.categories (workspace_id, name, kind, color, is_default) values
    (target_workspace, 'Sueldo', 'income', '#0f766e', true),
    (target_workspace, 'Extra', 'income', '#14b8a6', true),
    (target_workspace, 'Venta', 'income', '#22c55e', true),
    (target_workspace, 'Otro ingreso', 'income', '#65a30d', true),
    (target_workspace, 'Comida', 'expense', '#ef4444', true),
    (target_workspace, 'Transporte', 'expense', '#f97316', true),
    (target_workspace, 'Servicios', 'expense', '#eab308', true),
    (target_workspace, 'Alquiler', 'expense', '#8b5cf6', true),
    (target_workspace, 'Salud', 'expense', '#ec4899', true),
    (target_workspace, 'Ocio', 'expense', '#06b6d4', true),
    (target_workspace, 'Compras', 'expense', '#6366f1', true),
    (target_workspace, 'Educación', 'expense', '#0ea5e9', true),
    (target_workspace, 'Otro gasto', 'expense', '#64748b', true)
  on conflict do nothing;
end;
$$;

create or replace function public.after_workspace_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role) values (new.id, new.owner_id, 'owner') on conflict do nothing;
  perform public.seed_workspace_defaults(new.id);
  return new;
end;
$$;
create trigger after_workspace_created after insert on public.workspaces for each row execute function public.after_workspace_created();

create or replace function public.create_personal_workspace_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspaces (name, type, owner_id) values ('Personal', 'personal', new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_personal_workspace_for_new_user();

create or replace function public.set_account_current_balance()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.current_balance = 0 then
    new.current_balance = new.initial_balance;
  end if;
  return new;
end;
$$;
create trigger set_account_current_balance before insert on public.accounts for each row execute function public.set_account_current_balance();

create or replace function public.validate_movement_accounts()
returns trigger language plpgsql security definer set search_path = public as $$
declare source_account public.accounts%rowtype; destination_account public.accounts%rowtype; selected_category public.categories%rowtype;
begin
  select * into source_account from public.accounts where id = new.account_id;
  if source_account.workspace_id <> new.workspace_id or source_account.currency <> new.currency then
    raise exception 'Source account must belong to movement workspace and currency';
  end if;
  if new.transfer_account_id is not null then
    select * into destination_account from public.accounts where id = new.transfer_account_id;
    if destination_account.workspace_id <> new.workspace_id or destination_account.currency <> new.currency then
      raise exception 'Destination account must belong to movement workspace and currency';
    end if;
  end if;
  if new.category_id is not null then
    select * into selected_category from public.categories where id = new.category_id;
    if selected_category.workspace_id <> new.workspace_id then
      raise exception 'Category must belong to movement workspace';
    end if;
  end if;
  return new;
end;
$$;
create trigger validate_movement_accounts before insert or update on public.movements for each row execute function public.validate_movement_accounts();

create or replace function public.apply_movement_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.type = 'income' then
      update public.accounts set current_balance = current_balance + new.amount where id = new.account_id;
    elsif new.type = 'expense' then
      update public.accounts set current_balance = current_balance - new.amount where id = new.account_id;
    else
      update public.accounts set current_balance = current_balance - new.amount where id = new.account_id;
      update public.accounts set current_balance = current_balance + new.amount where id = new.transfer_account_id;
    end if;
    return new;
  end if;
  return new;
end;
$$;
create trigger apply_movement_balance after insert on public.movements for each row execute function public.apply_movement_balance();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.movements enable row level security;
alter table public.savings_goals enable row level security;

create policy "members can view workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "authenticated users can create workspaces" on public.workspaces for insert with check (auth.uid() = owner_id);
create policy "owners and admins can update workspaces" on public.workspaces for update using (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[]));

create policy "users can view own memberships" on public.workspace_members for select using (user_id = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "owners and admins manage members" on public.workspace_members for insert with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "owners and admins update members" on public.workspace_members for update using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "admins manage invitations" on public.workspace_invitations for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members view accounts" on public.accounts for select using (public.is_workspace_member(workspace_id));
create policy "admins manage accounts" on public.accounts for insert with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "admins update accounts" on public.accounts for update using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members view categories" on public.categories for select using (public.is_workspace_member(workspace_id));
create policy "members create categories" on public.categories for insert with check (public.is_workspace_member(workspace_id));
create policy "members update categories" on public.categories for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "members view movements" on public.movements for select using (public.is_workspace_member(workspace_id));
create policy "members create movements" on public.movements for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "creator or admins update movements" on public.movements for update using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.is_workspace_member(workspace_id));

create policy "members view goals" on public.savings_goals for select using (public.is_workspace_member(workspace_id));
create policy "members create goals" on public.savings_goals for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "members update goals" on public.savings_goals for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
