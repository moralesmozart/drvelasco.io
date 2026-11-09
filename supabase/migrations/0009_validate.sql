-- Rejects public submissions whose answers have the wrong shape for their field type
-- (e.g. a crafted request sending a list with empty items), so a bad card can never reach the board.
-- Run after 0007_family.sql.

create or replace function valid_field_value(p_type text, v jsonb) returns boolean
language sql immutable as $$
  select case
    when v is null or v = 'null'::jsonb then true
    when p_type in ('short_text', 'email', 'phone', 'radio', 'select') then
      jsonb_typeof(v) = 'string' and length(v #>> '{}') <= 2000
    when p_type = 'long_text' then
      jsonb_typeof(v) = 'string' and length(v #>> '{}') <= 20000
    when p_type = 'date' then
      jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$'
    when p_type in ('number', 'currency') then
      jsonb_typeof(v) = 'number'
    when p_type = 'checklist' then
      jsonb_typeof(v) = 'array' and jsonb_array_length(v) <= 100
      and not exists (select 1 from jsonb_array_elements(v) x where jsonb_typeof(x) <> 'string' or length(x #>> '{}') > 500)
    when p_type = 'attachment' then
      jsonb_typeof(v) = 'array' and jsonb_array_length(v) <= 10
      and not exists (
        select 1 from jsonb_array_elements(v) x
        where jsonb_typeof(x) <> 'object'
           or jsonb_typeof(x -> 'path') is distinct from 'string'
           or jsonb_typeof(x -> 'name') is distinct from 'string'
           or length(x ->> 'name') > 255
           or (x ? 'size' and jsonb_typeof(x -> 'size') <> 'number')
           or (x ? 'mime' and jsonb_typeof(x -> 'mime') <> 'string'))
    else true
  end
$$;

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

      if v is not null and not valid_field_value(f.type, v) then
        raise exception 'invalid_value: %', f.label;
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

