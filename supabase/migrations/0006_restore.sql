-- Restoring a backup: lets admins write back the original history of restored cards.
-- (Inserting a card logs a new "created" event; this replaces those with the events from the backup.)
create or replace function restore_card_events(p_events jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_admin() then raise exception 'not_allowed'; end if;

  delete from card_events
  where card_id in (select distinct (e ->> 'card_id')::uuid from jsonb_array_elements(p_events) e);

  insert into card_events(card_id, type, payload, actor, created_at)
  select (e ->> 'card_id')::uuid, e ->> 'type', coalesce(e -> 'payload', '{}'::jsonb),
         nullif(e ->> 'actor', '')::uuid, coalesce((e ->> 'created_at')::timestamptz, now())
  from jsonb_array_elements(p_events) e
  where exists (select 1 from cards c where c.id = (e ->> 'card_id')::uuid);

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function restore_card_events(jsonb) from public;
grant execute on function restore_card_events(jsonb) to authenticated;
