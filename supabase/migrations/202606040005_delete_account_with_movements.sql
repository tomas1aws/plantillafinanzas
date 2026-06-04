-- Permanently delete an account and every movement that references it, then
-- rebuild the remaining account balances in the same workspace.
create or replace function public.delete_account_with_movements(target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected_account public.accounts%rowtype;
begin
  select * into selected_account
  from public.accounts
  where id = target_id
  for update;

  if selected_account.id is null then
    raise exception 'Account not found';
  end if;

  if not public.has_workspace_role(selected_account.workspace_id, array['owner','admin']::public.workspace_role[]) then
    raise exception 'Only workspace owners and admins can delete accounts';
  end if;

  delete from public.movements
  where account_id = target_id or transfer_account_id = target_id;

  delete from public.accounts
  where id = target_id;

  update public.accounts as account
  set current_balance = account.initial_balance + coalesce((
    select sum(
      case when movement.type = 'income' and movement.account_id = account.id then movement.amount else 0 end
      - case when movement.type = 'expense' and movement.account_id = account.id then movement.amount else 0 end
      - case when movement.type = 'transfer' and movement.account_id = account.id then movement.amount else 0 end
      + case when movement.type = 'transfer' and movement.transfer_account_id = account.id then movement.amount else 0 end
    )
    from public.movements as movement
    where movement.workspace_id = selected_account.workspace_id
      and not movement.is_reversed
      and (movement.account_id = account.id or movement.transfer_account_id = account.id)
  ), 0)
  where account.workspace_id = selected_account.workspace_id;
end;
$$;

grant execute on function public.delete_account_with_movements(uuid) to authenticated;
revoke execute on function public.delete_account_with_movements(uuid) from public;
