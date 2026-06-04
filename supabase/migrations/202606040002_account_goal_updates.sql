-- Keep account balances consistent when editable account fields change.
create or replace function public.validate_account_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.currency <> old.currency and exists (
    select 1 from public.movements
    where account_id = old.id or transfer_account_id = old.id
  ) then
    raise exception 'Account currency cannot change after movements exist';
  end if;

  if new.initial_balance <> old.initial_balance then
    new.current_balance = old.current_balance + (new.initial_balance - old.initial_balance);
  end if;
  return new;
end;
$$;

create trigger validate_account_update
before update on public.accounts
for each row execute function public.validate_account_update();

create policy "members delete goals" on public.savings_goals
for delete using (public.is_workspace_member(workspace_id));
