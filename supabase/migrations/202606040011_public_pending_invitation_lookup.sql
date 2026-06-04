-- Allow the public invite page to look up a pending invitation by its secret token.
-- The application query always combines token equality with status = 'pending'.
grant select on table public.workspace_invitations to anon, authenticated;
grant select on table public.workspaces to anon, authenticated;

drop policy if exists "public can read pending invitations" on public.workspace_invitations;
create policy "public can read pending invitations"
on public.workspace_invitations
for select
to anon, authenticated
using (status = 'pending');

-- The embedded workspaces relationship in the public invitation query only needs
-- the workspace attached to a currently pending invitation.
drop policy if exists "public can read workspaces with pending invitations" on public.workspaces;
create policy "public can read workspaces with pending invitations"
on public.workspaces
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.workspace_invitations invitation
    where invitation.workspace_id = workspaces.id
      and invitation.status = 'pending'
  )
);
