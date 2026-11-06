-- Forms: file uploads, conditional fields, safer public submission.
-- Run after 0001_init.sql.

-- ─────────────────────────────────────────────────────────────
-- Storage: private bucket. The public may only upload into incoming/.
-- Nobody but admins can read or list files.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists attachments_public_upload on storage.objects;
create policy attachments_public_upload on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = 'incoming');

drop policy if exists attachments_admin_all on storage.objects;
create policy attachments_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and is_admin())
  with check (bucket_id = 'attachments' and is_admin());

-- ─────────────────────────────────────────────────────────────
-- Conditional visibility: every condition must match.
--   {field_id, op: 'equals' | 'contains' | 'filled', value}
-- ─────────────────────────────────────────────────────────────
create or replace function field_visible(p_conditions jsonb, p_values jsonb) returns boolean
language plpgsql immutable as $$
declare c jsonb; v jsonb; ok boolean;
begin
  for c in select * from jsonb_array_elements(coalesce(p_conditions, '[]'::jsonb)) loop
    v := p_values -> (c ->> 'field_id');
    ok := case c ->> 'op'
      when 'filled' then v is not null and v not in ('""'::jsonb, '[]'::jsonb, 'null'::jsonb)
      when 'equals' then (jsonb_typeof(v) = 'array' and v ? (c ->> 'value')) or (v #>> '{}') = (c ->> 'value')
      when 'contains' then (jsonb_typeof(v) = 'array' and v ? (c ->> 'value'))
                        or position(lower(c ->> 'value') in lower(coalesce(v #>> '{}', ''))) > 0
      else true end;
    if not coalesce(ok, false) then return false; end if;
  end loop;
  return true;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Public submission (replaces the 0001 version)
--   p_values: { field_id: value }. Attachment values: [{path, name, size, mime}]
--   p_hp: honeypot; bots fill it, humans never see it.
-- ─────────────────────────────────────────────────────────────
drop function if exists submit_public_form(text, jsonb);

create or replace function submit_public_form(p_slug text, p_values jsonb, p_hp text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_pipe pipes;
  v_phase uuid;
  v_title text;
  v_card uuid;
  v_clean jsonb := '{}'::jsonb;
  f record;
  v jsonb;
  a jsonb;
begin
  if coalesce(p_hp, '') <> '' then return null; end if;

  select * into v_pipe from pipes where form_slug = p_slug;
  if not found then raise exception 'form_not_found'; end if;

  if (select count(*) from cards where pipe_id = v_pipe.id and created_via = 'public_form'
        and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'too_many_requests';
  end if;

  select id into v_phase from phases where pipe_id = v_pipe.id order by position limit 1;
  if v_phase is null then raise exception 'pipe_has_no_phases'; end if;

  for f in select * from fields where pipe_id = v_pipe.id and phase_id is null and type <> 'info' order by position loop
    if not field_visible(f.conditions, p_values) then continue; end if;
    v := p_values -> f.id::text;

    if f.required and (v is null or v in ('""'::jsonb, '[]'::jsonb, 'null'::jsonb)) then
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

    if v_title is null and f.type = 'short_text' then v_title := v #>> '{}'; end if;
  end loop;

  if pg_column_size(v_clean) > 200000 then raise exception 'payload_too_large'; end if;

  insert into cards(pipe_id, phase_id, title, "values", position, created_via)
  values (v_pipe.id, v_phase, coalesce(nullif(trim(v_title), ''), 'Novo card'), v_clean,
          coalesce((select max(position) from cards where phase_id = v_phase), 0) + 1000, 'public_form')
  returning id into v_card;

  insert into attachments(card_id, field_id, storage_path, file_name, mime, size_bytes)
  select v_card, (e.key)::uuid, x ->> 'path', coalesce(x ->> 'name', 'arquivo'), x ->> 'mime', (x ->> 'size')::int
  from jsonb_each(v_clean) e
  join fields fl on fl.id = (e.key)::uuid and fl.type = 'attachment'
  cross join lateral jsonb_array_elements(e.value) x;

  return v_card;
end $$;

revoke all on function submit_public_form(text, jsonb, text) from public;
grant execute on function submit_public_form(text, jsonb, text) to anon, authenticated;
