-- Owner-only workspace reset and deletion operations.
-- These functions keep the authorization checks and destructive writes in the
-- same transaction so callers cannot bypass workspace protections.
create or replace function public.reset_personal_workspace(target_workspace uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_workspace public.workspaces%rowtype;
begin
  select *
    into selected_workspace
  from public.workspaces
  where id = target_workspace
  for update;

  if selected_workspace.id is null then
    raise exception 'El workspace no existe.';
  end if;

  if selected_workspace.owner_id <> auth.uid()
    or not public.has_workspace_role(target_workspace, array['owner']::public.workspace_role[]) then
    raise exception 'Solo el owner puede resetear el workspace.';
  end if;

  if selected_workspace.type <> 'personal' then
    raise exception 'Solo se puede resetear un workspace personal.';
  end if;

  delete from public.movements where workspace_id = target_workspace;
  delete from public.savings_goals where workspace_id = target_workspace;
  delete from public.categories where workspace_id = target_workspace;
  delete from public.accounts where workspace_id = target_workspace;

  perform public.seed_workspace_defaults(target_workspace);
end;
$$;

create or replace function public.delete_workspace_cascade(target_workspace uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_workspace public.workspaces%rowtype;
  user_workspace_count bigint;
begin
  select *
    into selected_workspace
  from public.workspaces
  where id = target_workspace
  for update;

  if selected_workspace.id is null then
    raise exception 'El workspace no existe.';
  end if;

  if selected_workspace.owner_id <> auth.uid()
    or not public.has_workspace_role(target_workspace, array['owner']::public.workspace_role[]) then
    raise exception 'Solo el owner puede eliminar el workspace.';
  end if;

  if selected_workspace.type = 'personal' then
    raise exception 'El workspace personal no se puede eliminar. Podés resetearlo.';
  end if;

  select count(*)
    into user_workspace_count
  from public.workspace_members
  where user_id = auth.uid();

  if user_workspace_count <= 1 then
    raise exception 'No podés eliminar tu último workspace. Podés resetearlo.';
  end if;

  -- Preserve the personal-workspace invariant for every affected member, even
  -- when repairing legacy users who only belonged to this shared workspace.
  insert into public.workspaces (name, type, owner_id)
  select 'Personal', 'personal', member.user_id
  from public.workspace_members as member
  where member.workspace_id = target_workspace
    and not exists (
      select 1
      from public.workspaces as personal_workspace
      where personal_workspace.owner_id = member.user_id
        and personal_workspace.type = 'personal'
    );

  -- Delete explicitly in dependency order. This avoids the restrictive account
  -- foreign keys and documents every resource removed with the workspace.
  delete from public.movements where workspace_id = target_workspace;
  delete from public.savings_goals where workspace_id = target_workspace;
  delete from public.categories where workspace_id = target_workspace;
  delete from public.accounts where workspace_id = target_workspace;
  delete from public.workspace_invitations where workspace_id = target_workspace;
  delete from public.workspace_members where workspace_id = target_workspace;
  delete from public.workspaces where id = target_workspace;
end;
$$;

grant execute on function public.reset_personal_workspace(uuid) to authenticated;
grant execute on function public.delete_workspace_cascade(uuid) to authenticated;

revoke execute on function public.reset_personal_workspace(uuid) from public;
revoke execute on function public.delete_workspace_cascade(uuid) from public;


-- Onboarding always returns the user's original personal workspace and repairs
-- legacy users who have memberships but no personal workspace.
create or replace function public.get_or_create_personal_workspace(target_user uuid default auth.uid())
returns table (
  id uuid,
  name text,
  type public.workspace_type,
  owner_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  role public.workspace_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_workspace public.workspaces%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user is available for workspace onboarding';
  end if;

  if target_user is null or target_user <> auth.uid() then
    raise exception 'Workspace onboarding can only run for the authenticated user';
  end if;

  select w.*
    into selected_workspace
  from public.workspaces as w
  where w.owner_id = target_user
    and w.type = 'personal'
  order by w.created_at asc
  limit 1;

  if selected_workspace.id is null then
    insert into public.workspaces (name, type, owner_id)
    values ('Personal', 'personal', target_user)
    returning * into selected_workspace;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (selected_workspace.id, target_user, 'owner')
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  return query
  select
    selected_workspace.id,
    selected_workspace.name,
    selected_workspace.type,
    selected_workspace.owner_id,
    selected_workspace.created_at,
    selected_workspace.updated_at,
    wm.role
  from public.workspace_members as wm
  where wm.workspace_id = selected_workspace.id
    and wm.user_id = target_user
  limit 1;
end;
$$;

grant execute on function public.get_or_create_personal_workspace(uuid) to authenticated;
revoke execute on function public.get_or_create_personal_workspace(uuid) from public;
