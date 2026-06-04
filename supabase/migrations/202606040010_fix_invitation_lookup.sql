-- Keep invitation lookup behind a security-definer function so anonymous invite
-- pages can validate a token without granting access to every pending invitation.
alter table public.workspace_invitations
  alter column expires_at set default (now() + interval '7 days');

update public.workspace_invitations
set expires_at = now() + interval '7 days'
where status = 'pending' and expires_at is null;

create or replace function public.get_invitation_details(target_token uuid)
returns table (workspace_name text, email text, role public.workspace_role, status public.invitation_status, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select w.name, i.email, i.role, i.status, i.expires_at
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = target_token
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1;
$$;
