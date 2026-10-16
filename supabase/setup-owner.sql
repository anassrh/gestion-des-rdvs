-- Run only after creating benoit.admin@demo.local in Authentication > Users.
-- Set the user's password in the dashboard. No password or admin secret is stored here.
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email)='benoit.admin@demo.local';
  if admin_id is null then raise exception 'Create benoit.admin@demo.local in Authentication > Users first.'; end if;
  update public.profiles set auth_user_id=admin_id,updated_at=now() where id='11111111-1111-4111-8111-111111111111';
  if not found then raise exception 'Run the core migration first.'; end if;
end $$;
