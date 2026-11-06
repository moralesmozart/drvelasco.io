-- Email alert when a new card arrives from the public form.
-- Calls the Edge Function "notify-new-card" through pg_net. Configure it with:
--   insert into app_settings(key, value) values
--     ('notify_url', 'https://<project-ref>.supabase.co/functions/v1/notify-new-card'),
--     ('notify_secret', '<same value as the NOTIFY_SECRET function secret>')
--   on conflict (key) do update set value = excluded.value;
-- Without these rows nothing is sent.

create extension if not exists pg_net with schema extensions;

create table if not exists app_settings (
  key text primary key,
  value text not null
);
alter table app_settings enable row level security; -- no policies: readable only by server-side code

create or replace function notify_new_card() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text;
begin
  if new.created_via <> 'public_form' then return new; end if;
  select value into v_url from app_settings where key = 'notify_url';
  if v_url is null or v_url = '' then return new; end if;
  select value into v_secret from app_settings where key = 'notify_secret';
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('card_id', new.id, 'pipe_id', new.pipe_id, 'title', new.title),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', coalesce(v_secret, ''))
  );
  return new;
exception when others then
  return new; -- never block a submission because of an alert
end $$;

drop trigger if exists trg_notify_new_card on cards;
create trigger trg_notify_new_card after insert on cards for each row execute function notify_new_card();
