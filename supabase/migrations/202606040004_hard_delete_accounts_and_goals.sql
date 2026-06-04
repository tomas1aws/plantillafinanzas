-- Accounts and savings goals are permanently deleted. Foreign keys keep accounts
-- with associated movements from being removed.

drop function if exists public.remove_or_deactivate_account(uuid);

create policy "admins delete accounts"
on public.accounts for delete
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members delete goals"
on public.savings_goals for delete
using (public.is_workspace_member(workspace_id));
