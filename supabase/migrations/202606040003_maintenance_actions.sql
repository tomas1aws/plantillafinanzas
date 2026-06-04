-- Safe maintenance actions for accounts, movements and categories.
alter table public.categories
  add column if not exists is_active boolean not null default true;

alter table public.movements
  add column if not exists is_reversed boolean not null default false,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid references auth.users(id) on delete set null;

create index if not exists idx_movements_workspace_active_date
  on public.movements(workspace_id, is_reversed, date desc);

create or replace function public.validate_movement_accounts()
returns trigger language plpgsql security definer set search_path = public as $$
declare source_account public.accounts%rowtype; destination_account public.accounts%rowtype; selected_category public.categories%rowtype;
begin
  select * into source_account from public.accounts where id = new.account_id;
  if source_account.id is null or source_account.workspace_id <> new.workspace_id or source_account.currency <> new.currency then
    raise exception 'Source account must belong to movement workspace and currency';
  end if;
  if tg_op = 'INSERT' and not source_account.is_active then
    raise exception 'Source account is inactive';
  end if;

  if new.transfer_account_id is not null then
    select * into destination_account from public.accounts where id = new.transfer_account_id;
    if destination_account.id is null or destination_account.workspace_id <> new.workspace_id or destination_account.currency <> new.currency then
      raise exception 'Destination account must belong to movement workspace and currency';
    end if;
    if tg_op = 'INSERT' and not destination_account.is_active then
      raise exception 'Destination account is inactive';
    end if;
  end if;

  if new.category_id is not null then
    select * into selected_category from public.categories where id = new.category_id;
    if selected_category.id is null or selected_category.workspace_id <> new.workspace_id then
      raise exception 'Category must belong to movement workspace';
    end if;
    if tg_op = 'INSERT' and not selected_category.is_active then
      raise exception 'Category is inactive';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.reverse_movement_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_reversed and not new.is_reversed then
    raise exception 'A reversed movement cannot be restored';
  end if;

  if not old.is_reversed and new.is_reversed then
    if old.type = 'income' then
      update public.accounts set current_balance = current_balance - old.amount where id = old.account_id;
    elsif old.type = 'expense' then
      update public.accounts set current_balance = current_balance + old.amount where id = old.account_id;
    else
      update public.accounts set current_balance = current_balance + old.amount where id = old.account_id;
      update public.accounts set current_balance = current_balance - old.amount where id = old.transfer_account_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reverse_movement_balance on public.movements;
create trigger reverse_movement_balance
after update of is_reversed on public.movements
for each row execute function public.reverse_movement_balance();

create or replace function public.reverse_movement(target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected_movement public.movements%rowtype;
begin
  select * into selected_movement from public.movements where id = target_id for update;
  if selected_movement.id is null then raise exception 'Movement not found'; end if;
  if not (selected_movement.created_by = auth.uid() or public.has_workspace_role(selected_movement.workspace_id, array['owner','admin']::public.workspace_role[])) then
    raise exception 'You cannot reverse this movement';
  end if;
  if selected_movement.is_reversed then raise exception 'Movement is already reversed'; end if;

  update public.movements
  set is_reversed = true, reversed_at = now(), reversed_by = auth.uid()
  where id = target_id;
end;
$$;

create or replace function public.remove_or_deactivate_account(target_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare selected_account public.accounts%rowtype;
begin
  select * into selected_account from public.accounts where id = target_id for update;
  if selected_account.id is null then raise exception 'Account not found'; end if;
  if not public.has_workspace_role(selected_account.workspace_id, array['owner','admin']::public.workspace_role[]) then
    raise exception 'Only workspace owners and admins can maintain accounts';
  end if;

  if exists (select 1 from public.movements where account_id = target_id or transfer_account_id = target_id) then
    update public.accounts set is_active = false where id = target_id;
    return 'deactivated';
  end if;

  delete from public.accounts where id = target_id;
  return 'deleted';
end;
$$;

create or replace function public.remove_or_deactivate_category(target_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare selected_category public.categories%rowtype;
begin
  select * into selected_category from public.categories where id = target_id for update;
  if selected_category.id is null then raise exception 'Category not found'; end if;
  if not public.is_workspace_member(selected_category.workspace_id) then raise exception 'You cannot maintain this category'; end if;

  if exists (select 1 from public.movements where category_id = target_id) then
    update public.categories set is_active = false where id = target_id;
    return 'deactivated';
  end if;

  delete from public.categories where id = target_id;
  return 'deleted';
end;
$$;

grant execute on function public.reverse_movement(uuid) to authenticated;
grant execute on function public.remove_or_deactivate_account(uuid) to authenticated;
grant execute on function public.remove_or_deactivate_category(uuid) to authenticated;

revoke execute on function public.reverse_movement(uuid) from public;
revoke execute on function public.remove_or_deactivate_account(uuid) from public;
revoke execute on function public.remove_or_deactivate_category(uuid) from public;
