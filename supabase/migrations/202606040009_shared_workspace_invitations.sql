-- Complete shared workspace invitation and member-management flow.
alter table public.workspace_invitations
  add column if not exists token uuid not null default gen_random_uuid(),
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists revoked_at timestamptz;

alter table public.workspace_invitations drop constraint if exists workspace_invitations_workspace_id_email_status_key;
create unique index if not exists workspace_invitations_token_key on public.workspace_invitations(token);
with duplicate_pending as (
  select id, row_number() over (partition by workspace_id, lower(email) order by created_at desc) as position
  from public.workspace_invitations where status = 'pending'
)
update public.workspace_invitations i set status = 'revoked', revoked_at = now()
from duplicate_pending d where i.id = d.id and d.position > 1;

create unique index if not exists workspace_invitations_one_pending_email
  on public.workspace_invitations(workspace_id, lower(email)) where status = 'pending';
create index if not exists idx_workspace_invitations_workspace_status on public.workspace_invitations(workspace_id, status);

create or replace function public.create_workspace_invitation(
  target_workspace uuid,
  target_email text,
  target_role public.workspace_role default 'member'
)
returns table (invitation_id uuid, invitation_token uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(target_email));
  created_invitation public.workspace_invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión para invitar miembros.'; end if;
  if not public.has_workspace_role(target_workspace, array['owner','admin']::public.workspace_role[]) then
    raise exception 'Solo owner o admin puede invitar miembros.';
  end if;
  if target_role not in ('admin', 'member') then raise exception 'El rol de la invitación no es válido.'; end if;
  if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'El email no es válido.'; end if;
  if exists (
    select 1 from public.workspace_members wm join auth.users u on u.id = wm.user_id
    where wm.workspace_id = target_workspace and lower(u.email) = normalized_email
  ) then raise exception 'Ese usuario ya pertenece al workspace.'; end if;

  update public.workspace_invitations
  set status = 'revoked', revoked_at = now()
  where workspace_id = target_workspace and lower(email) = normalized_email and status = 'pending';

  insert into public.workspace_invitations (workspace_id, email, role, invited_by)
  values (target_workspace, normalized_email, target_role, auth.uid())
  returning * into created_invitation;

  return query select created_invitation.id, created_invitation.token;
end;
$$;

create or replace function public.create_workspace_with_invitation(
  target_name text,
  target_type public.workspace_type default 'shared',
  invitation_email text default null,
  invitation_role public.workspace_role default 'member'
)
returns table (workspace_id uuid, invitation_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_workspace public.workspaces%rowtype;
  created_invitation record;
  created_token uuid;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión para crear un workspace.'; end if;
  if char_length(trim(target_name)) not between 2 and 80 then raise exception 'El nombre debe tener entre 2 y 80 caracteres.'; end if;
  if target_type = 'personal' and nullif(trim(invitation_email), '') is not null then
    raise exception 'Solo los workspaces compartidos admiten invitaciones.';
  end if;

  insert into public.workspaces (name, type, owner_id)
  values (trim(target_name), target_type, auth.uid())
  returning * into created_workspace;

  if target_type = 'shared' and nullif(trim(invitation_email), '') is not null then
    select * into created_invitation
    from public.create_workspace_invitation(created_workspace.id, invitation_email, invitation_role);
    created_token := created_invitation.invitation_token;
  end if;

  return query select created_workspace.id, created_token;
end;
$$;

create or replace function public.get_invitation_details(target_token uuid)
returns table (workspace_name text, email text, role public.workspace_role, status public.invitation_status, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select w.name, i.email, i.role, i.status, i.expires_at
  from public.workspace_invitations i join public.workspaces w on w.id = i.workspace_id
  where i.token = target_token
  limit 1;
$$;

create or replace function public.accept_workspace_invitation(target_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  selected_invitation public.workspace_invitations%rowtype;
  session_email text;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión para aceptar la invitación.'; end if;
  select lower(email) into session_email from auth.users where id = auth.uid();
  select * into selected_invitation from public.workspace_invitations where token = target_token for update;
  if selected_invitation.id is null then raise exception 'La invitación no existe.'; end if;
  if selected_invitation.status <> 'pending' then raise exception 'La invitación ya no está pendiente.'; end if;
  if selected_invitation.expires_at is not null and selected_invitation.expires_at < now() then raise exception 'La invitación venció.'; end if;
  if session_email is null or lower(selected_invitation.email) <> session_email then raise exception 'Esta invitación corresponde a otro email.'; end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (selected_invitation.workspace_id, auth.uid(), selected_invitation.role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  update public.workspace_invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = selected_invitation.id;
  return selected_invitation.workspace_id;
end;
$$;

create or replace function public.revoke_workspace_invitation(target_invitation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected_invitation public.workspace_invitations%rowtype;
begin
  select * into selected_invitation from public.workspace_invitations where id = target_invitation for update;
  if selected_invitation.id is null then raise exception 'La invitación no existe.'; end if;
  if not public.has_workspace_role(selected_invitation.workspace_id, array['owner','admin']::public.workspace_role[]) then raise exception 'No tenés permisos para revocar invitaciones.'; end if;
  if selected_invitation.status <> 'pending' then raise exception 'Solo se pueden revocar invitaciones pendientes.'; end if;
  update public.workspace_invitations set status = 'revoked', revoked_at = now() where id = target_invitation;
end; $$;

create or replace function public.update_workspace_member_role(target_member uuid, target_role public.workspace_role)
returns void language plpgsql security definer set search_path = public as $$
declare selected_member public.workspace_members%rowtype; owner_count bigint; replacement_owner uuid;
begin
  select * into selected_member from public.workspace_members where id = target_member for update;
  if selected_member.id is null then raise exception 'El miembro no existe.'; end if;
  if not public.has_workspace_role(selected_member.workspace_id, array['owner']::public.workspace_role[]) then raise exception 'Solo un owner puede cambiar roles.'; end if;
  if selected_member.role = 'owner' and target_role <> 'owner' then
    select count(*) into owner_count from public.workspace_members where workspace_id = selected_member.workspace_id and role = 'owner';
    if owner_count <= 1 then raise exception 'No se puede quitar al último owner.'; end if;
    select user_id into replacement_owner from public.workspace_members where workspace_id = selected_member.workspace_id and role = 'owner' and id <> target_member limit 1;
    update public.workspaces set owner_id = replacement_owner where id = selected_member.workspace_id and owner_id = selected_member.user_id;
  end if;
  update public.workspace_members set role = target_role where id = target_member;
end; $$;

create or replace function public.remove_workspace_member(target_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected_member public.workspace_members%rowtype; caller_role public.workspace_role; owner_count bigint;
begin
  select * into selected_member from public.workspace_members where id = target_member for update;
  if selected_member.id is null then raise exception 'El miembro no existe.'; end if;
  select role into caller_role from public.workspace_members where workspace_id = selected_member.workspace_id and user_id = auth.uid();
  if caller_role not in ('owner','admin') then raise exception 'No tenés permisos para quitar miembros.'; end if;
  if selected_member.role = 'owner' and caller_role <> 'owner' then raise exception 'Un admin no puede quitar a un owner.'; end if;
  if selected_member.role = 'owner' then
    select count(*) into owner_count from public.workspace_members where workspace_id = selected_member.workspace_id and role = 'owner';
    if owner_count <= 1 then raise exception 'No se puede quitar al último owner.'; end if;
    if exists (select 1 from public.workspaces where id = selected_member.workspace_id and owner_id = selected_member.user_id) then
      update public.workspaces set owner_id = (select user_id from public.workspace_members where workspace_id = selected_member.workspace_id and role = 'owner' and id <> target_member limit 1)
      where id = selected_member.workspace_id;
    end if;
  end if;
  delete from public.workspace_members where id = target_member;
end; $$;

grant execute on function public.create_workspace_invitation(uuid,text,public.workspace_role) to authenticated;
grant execute on function public.create_workspace_with_invitation(text,public.workspace_type,text,public.workspace_role) to authenticated;
grant execute on function public.get_invitation_details(uuid) to anon, authenticated;
grant execute on function public.accept_workspace_invitation(uuid) to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated;
grant execute on function public.update_workspace_member_role(uuid,public.workspace_role) to authenticated;
grant execute on function public.remove_workspace_member(uuid) to authenticated;

revoke execute on function public.create_workspace_invitation(uuid,text,public.workspace_role) from public;
revoke execute on function public.create_workspace_with_invitation(text,public.workspace_type,text,public.workspace_role) from public;
revoke execute on function public.accept_workspace_invitation(uuid) from public;
revoke execute on function public.revoke_workspace_invitation(uuid) from public;
revoke execute on function public.update_workspace_member_role(uuid,public.workspace_role) from public;
revoke execute on function public.remove_workspace_member(uuid) from public;

create or replace function public.get_workspace_members(target_workspace uuid)
returns table (id uuid, user_id uuid, email text, role public.workspace_role, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select wm.id, wm.user_id, u.email::text, wm.role, wm.created_at
  from public.workspace_members wm join auth.users u on u.id = wm.user_id
  where wm.workspace_id = target_workspace
    and public.has_workspace_role(target_workspace, array['owner','admin']::public.workspace_role[])
  order by case wm.role when 'owner' then 1 when 'admin' then 2 else 3 end, wm.created_at;
$$;
grant execute on function public.get_workspace_members(uuid) to authenticated;
revoke execute on function public.get_workspace_members(uuid) from public;
