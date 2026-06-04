-- Initial accounts are suggestions created only with a new workspace. Existing
-- workspaces must not recreate them after a user renames or deletes them.
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
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  where wm.user_id = target_user
  order by wm.created_at asc
  limit 1;

  if selected_workspace.id is null then
    insert into public.workspaces (name, type, owner_id)
    values ('Personal', 'personal', target_user)
    returning * into selected_workspace;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (selected_workspace.id, target_user, 'owner')
    on conflict (workspace_id, user_id) do update set role = excluded.role;

    perform public.seed_workspace_defaults(selected_workspace.id);
  end if;

  return query
  select
    selected_workspace.id,
    selected_workspace.name,
    selected_workspace.type,
    selected_workspace.owner_id,
    selected_workspace.created_at,
    selected_workspace.updated_at,
    wm.role
  from public.workspace_members wm
  where wm.workspace_id = selected_workspace.id
    and wm.user_id = target_user
  limit 1;
end;
$$;

grant execute on function public.get_or_create_personal_workspace(uuid) to authenticated;
