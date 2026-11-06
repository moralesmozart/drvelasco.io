-- Family requests: one holder card + linked member cards that move together.

alter table cards add column if not exists family_of uuid references cards(id) on delete cascade;
alter table cards add column if not exists relation text;  -- members: filha, filho, esposa, esposo, mae, pai, outro:<text>; holder: 'contato' when only the contact person
create index if not exists cards_family_idx on cards(family_of);

alter table fields add column if not exists per_person boolean not null default false;

-- Members always follow the holder's phase
create or replace function cards_family_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.family_of is null and new.phase_id is distinct from old.phase_id then
    update cards set phase_id = new.phase_id where family_of = new.id and phase_id is distinct from new.phase_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_cards_family_follow on cards;
create trigger trg_cards_family_follow after update of phase_id on cards for each row execute function cards_family_follow();

-- One email per family (not per person)
create or replace function notify_new_card() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text;
begin
  if new.created_via <> 'public_form' or new.family_of is not null then return new; end if;
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
  return new;
end $$;

-- Public submission with optional family members
--   p_family: [{ "relation": "filha", "values": { field_id: value } }]  (only per_person fields are kept)
--   p_holder_needs: false → the holder is only the contact person (their per-person answers are optional)
drop function if exists submit_public_form(text, jsonb, text);

create or replace function submit_public_form(
  p_slug text, p_values jsonb, p_hp text default null, p_family jsonb default '[]'::jsonb, p_holder_needs boolean default true
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_pipe pipes;
  v_phase uuid;
  v_title_field uuid;
  v_holder uuid;
  v_card uuid;
  m jsonb;
  v_clean jsonb;
  v_title text;
  v_pos double precision;
  f record;
  v jsonb;
  a jsonb;
  v_is_member boolean;
  v_src jsonb;
  v_pp text[];
begin
  if coalesce(p_hp, '') <> '' then return null; end if;
  if jsonb_typeof(coalesce(p_family, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_family, '[]'::jsonb)) > 10 then
    raise exception 'too_many_people';
  end if;

  select * into v_pipe from pipes where form_slug = p_slug;
  if not found then raise exception 'form_not_found'; end if;

  if (select count(*) from cards where pipe_id = v_pipe.id and created_via = 'public_form' and family_of is null
        and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'too_many_requests';
  end if;

  select id into v_phase from phases where pipe_id = v_pipe.id order by position limit 1;
  if v_phase is null then raise exception 'pipe_has_no_phases'; end if;

  select id into v_title_field from fields
  where pipe_id = v_pipe.id and phase_id is null and type = 'short_text' order by position limit 1;

  -- per-person answers of a member never fall back to the holder's
  select coalesce(array_agg(id::text), '{}') into v_pp from fields where pipe_id = v_pipe.id and per_person;

  v_pos := coalesce((select max(position) from cards where phase_id = v_phase), 0);

  -- holder first (i = 0), then each member
  for i in 0 .. jsonb_array_length(coalesce(p_family, '[]'::jsonb)) loop
    v_is_member := i > 0;
    if v_is_member then
      m := p_family -> (i - 1);
      v_src := coalesce(m -> 'values', '{}'::jsonb);
    else
      v_src := p_values;
    end if;
    v_clean := '{}'::jsonb;
    v_title := null;

    for f in select * from fields where pipe_id = v_pipe.id and phase_id is null and type <> 'info' order by position loop
      if v_is_member and not f.per_person then continue; end if;
      -- conditions see the holder's shared answers too
      if not field_visible(f.conditions, case when v_is_member then (p_values - v_pp) || v_src else v_src end) then continue; end if;
      v := v_src -> f.id::text;

      if f.required and (v is null or v in ('""'::jsonb, '[]'::jsonb, 'null'::jsonb))
         and not (not v_is_member and not p_holder_needs and f.per_person and f.id <> v_title_field) then
        raise exception 'required_field_missing: %', f.label;
      end if;

      if v is not null then
        if f.type = 'attachment' then
          if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 10 then raise exception 'invalid_attachment'; end if;
          for a in select * from jsonb_array_elements(v) loop
            if (a ->> 'path') not like 'incoming/%' or (a ->> 'path') like '%..%' then raise exception 'invalid_attachment'; end if;
          end loop;
        end if;
        v_clean := v_clean || jsonb_build_object(f.id::text, v);
      end if;
      if f.id = v_title_field then v_title := v #>> '{}'; end if;
    end loop;

    if pg_column_size(v_clean) > 200000 then raise exception 'payload_too_large'; end if;
    v_pos := v_pos + 1000;

    insert into cards(pipe_id, phase_id, title, "values", position, created_via, family_of, relation)
    values (
      v_pipe.id, v_phase, coalesce(nullif(trim(v_title), ''), 'Novo card'), v_clean, v_pos, 'public_form',
      case when v_is_member then v_holder end,
      case when v_is_member then left(coalesce(m ->> 'relation', 'outro'), 60)
           when not p_holder_needs and jsonb_array_length(coalesce(p_family, '[]'::jsonb)) > 0 then 'contato' end
    )
    returning id into v_card;
    if not v_is_member then v_holder := v_card; end if;

    insert into attachments(card_id, field_id, storage_path, file_name, mime, size_bytes)
    select v_card, (e.key)::uuid, x ->> 'path', coalesce(x ->> 'name', 'arquivo'), x ->> 'mime', (x ->> 'size')::int
    from jsonb_each(v_clean) e
    join fields fl on fl.id = (e.key)::uuid and fl.type = 'attachment'
    cross join lateral jsonb_array_elements(e.value) x;
  end loop;

  return v_holder;
end $$;

revoke all on function submit_public_form(text, jsonb, text, jsonb, boolean) from public;
grant execute on function submit_public_form(text, jsonb, text, jsonb, boolean) to anon, authenticated;
