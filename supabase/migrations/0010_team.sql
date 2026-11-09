-- Team area: every admin can see who has access, their last login and last activity.
-- Run after 0001_init.sql.

alter table app_admins add column if not exists last_seen_at timestamptz;

-- Called by the app while someone is using it (at most one write every 2 minutes)
create or replace function touch_presence() returns void
language sql security definer set search_path = public as $$
  update app_admins set last_seen_at = now()
  where user_id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '2 minutes');
$$;

-- The team list (admins only). Reads auth.users, which the browser can't access directly.
create or replace function list_team() returns table (
  user_id uuid, email text, name text, avatar jsonb, last_sign_in_at timestamptz, last_seen_at timestamptz, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_allowed'; end if;
  return query
    select a.user_id, u.email::text, u.raw_user_meta_data ->> 'name', u.raw_user_meta_data -> 'avatar',
           u.last_sign_in_at, a.last_seen_at, a.created_at
    from app_admins a join auth.users u on u.id = a.user_id
    order by greatest(coalesce(a.last_seen_at, 'epoch'), coalesce(u.last_sign_in_at, 'epoch')) desc;
end $$;

revoke all on function touch_presence() from public;
revoke all on function list_team() from public;
grant execute on function touch_presence() to authenticated;
grant execute on function list_team() to authenticated;
