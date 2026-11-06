-- Pipe-lite: initial schema
-- Run once in Supabase → SQL Editor. Safe to read top to bottom.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Admins (single workspace): only users listed here can see/edit data.
-- After creating your user in Auth → Users, run:
--   insert into app_admins(user_id) values ('<your-user-uuid>');
-- ─────────────────────────────────────────────────────────────
create table if not exists app_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- Core tables
-- ─────────────────────────────────────────────────────────────
create table if not exists pipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'clipboard',
  color text not null default '#4d7c0f',
  form_slug text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  form_settings jsonb not null default '{}'::jsonb,   -- title, description, logo, colors, success message
  created_at timestamptz not null default now()
);

create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  pipe_id uuid not null references pipes on delete cascade,
  name text not null,
  color text not null default '#2563eb',
  description text,
  position int not null default 0,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists phases_pipe_idx on phases(pipe_id, position);

-- phase_id NULL = field of the start form (the public form)
create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  pipe_id uuid not null references pipes on delete cascade,
  phase_id uuid references phases on delete cascade,
  type text not null check (type in (
    'short_text','long_text','info','attachment','checklist','radio','select',
    'date','email','phone','number','currency'
  )),
  label text not null,
  description text,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,      -- ["Sim","Não"] for checklist/radio/select
  conditions jsonb not null default '[]'::jsonb,   -- [{field_id, op:'equals'|'contains'|'filled', value}] → show only if all match
  show_on_card boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fields_pipe_idx on fields(pipe_id, phase_id, position);

-- Allowed moves. If a phase has no rows here, it may move to any phase.
create table if not exists phase_transitions (
  from_phase_id uuid not null references phases on delete cascade,
  to_phase_id uuid not null references phases on delete cascade,
  primary key (from_phase_id, to_phase_id)
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  pipe_id uuid not null references pipes on delete cascade,
  phase_id uuid not null references phases on delete restrict,
  title text not null default '',
  "values" jsonb not null default '{}'::jsonb,      -- { "<field_id>": value }
  position double precision not null default 0,
  created_via text not null default 'internal' check (created_via in ('internal','public_form','import')),
  phase_entered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cards_board_idx on cards(pipe_id, phase_id, position);

-- Audit trail: created / moved / field_edited (written by triggers, never by the client)
create table if not exists card_events (
  id bigint generated always as identity primary key,
  card_id uuid not null references cards on delete cascade,
  type text not null check (type in ('created','moved','field_edited','title_edited')),
  payload jsonb not null default '{}'::jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);
create index if not exists card_events_card_idx on card_events(card_id, created_at);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards on delete cascade,
  field_id uuid references fields on delete set null,
  storage_path text not null,
  file_name text not null,
  mime text,
  size_bytes int,
  created_at timestamptz not null default now()
);

-- PDF templates: only the template is stored. PDFs are generated & downloaded, never saved.
create table if not exists pdf_templates (
  id uuid primary key default gen_random_uuid(),
  pipe_id uuid not null references pipes on delete cascade,
  name text not null,
  content jsonb not null default '{}'::jsonb,   -- TipTap JSON
  page jsonb not null default '{"size":"A4","margin":20}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists system_heartbeat (
  id int primary key default 1 check (id = 1),
  beat_at timestamptz not null default now()
);
insert into system_heartbeat(id) values (1) on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- Audit triggers
-- ─────────────────────────────────────────────────────────────
create or replace function card_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into card_events(card_id, type, payload, actor)
  values (new.id, 'created', jsonb_build_object('phase_id', new.phase_id, 'via', new.created_via), auth.uid());
  return new;
end $$;

create or replace function card_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if new.phase_id is distinct from old.phase_id then
    new.phase_entered_at := now();
    insert into card_events(card_id, type, payload, actor)
    values (new.id, 'moved', jsonb_build_object('from', old.phase_id, 'to', new.phase_id), auth.uid());
  end if;

  if new.title is distinct from old.title then
    insert into card_events(card_id, type, payload, actor)
    values (new.id, 'title_edited', jsonb_build_object('old', old.title, 'new', new.title), auth.uid());
  end if;

  for k in select key from jsonb_each(new."values") union select key from jsonb_each(old."values") loop
    if (new."values" -> k) is distinct from (old."values" -> k) then
      insert into card_events(card_id, type, payload, actor)
      values (new.id, 'field_edited',
              jsonb_build_object('field_id', k, 'old', old."values" -> k, 'new', new."values" -> k), auth.uid());
    end if;
  end loop;

  if new is distinct from old then new.updated_at := now(); end if;
  return new;
end $$;

drop trigger if exists trg_card_after_insert on cards;
create trigger trg_card_after_insert after insert on cards for each row execute function card_after_insert();
drop trigger if exists trg_card_before_update on cards;
create trigger trg_card_before_update before update on cards for each row execute function card_before_update();

-- ─────────────────────────────────────────────────────────────
-- Row-level security: admins only. The public never touches tables directly.
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['pipes','phases','fields','phase_transitions','cards','attachments','pdf_templates'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists admin_all on %I', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

alter table card_events enable row level security;
drop policy if exists admin_read on card_events;
create policy admin_read on card_events for select to authenticated using (is_admin());

alter table app_admins enable row level security;
drop policy if exists self_read on app_admins;
create policy self_read on app_admins for select to authenticated using (user_id = auth.uid());

alter table system_heartbeat enable row level security;   -- no policies: only via heartbeat()

-- ─────────────────────────────────────────────────────────────
-- Public RPCs (callable with the anon key)
-- ─────────────────────────────────────────────────────────────

-- Keep-alive: called daily by GitHub Actions.
create or replace function heartbeat() returns timestamptz
language sql security definer set search_path = public as $$
  update system_heartbeat set beat_at = now() where id = 1 returning beat_at;
$$;

-- Public form definition (start-form fields only, nothing about existing cards).
create or replace function get_public_form(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pipe', jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color, 'settings', p.form_settings),
    'fields', coalesce((
      select jsonb_agg(to_jsonb(f) - 'pipe_id' - 'show_on_card' - 'created_at' order by f.position)
      from fields f where f.pipe_id = p.id and f.phase_id is null), '[]'::jsonb)
  )
  from pipes p where p.form_slug = p_slug;
$$;

-- Public submission → creates a card in the first phase.
-- (Phase 2 will put a captcha-checking Edge Function in front of this.)
create or replace function submit_public_form(p_slug text, p_values jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_pipe pipes;
  v_phase uuid;
  v_title text;
  v_card uuid;
  v_missing text;
begin
  select * into v_pipe from pipes where form_slug = p_slug;
  if not found then raise exception 'form_not_found'; end if;

  select id into v_phase from phases where pipe_id = v_pipe.id order by position limit 1;
  if v_phase is null then raise exception 'pipe_has_no_phases'; end if;

  -- keep only known start-form fields
  select coalesce(jsonb_object_agg(f.id::text, p_values -> f.id::text), '{}'::jsonb) into p_values
  from fields f where f.pipe_id = v_pipe.id and f.phase_id is null and p_values ? f.id::text;

  select f.label into v_missing from fields f
  where f.pipe_id = v_pipe.id and f.phase_id is null and f.required
    and coalesce(trim(p_values ->> f.id::text), '') in ('', '[]', 'null')
  limit 1;
  if v_missing is not null then raise exception 'required_field_missing: %', v_missing; end if;

  if pg_column_size(p_values) > 200000 then raise exception 'payload_too_large'; end if;

  select p_values ->> f.id::text into v_title from fields f
  where f.pipe_id = v_pipe.id and f.phase_id is null and f.type = 'short_text'
  order by f.position limit 1;

  insert into cards(pipe_id, phase_id, title, "values", position, created_via)
  values (v_pipe.id, v_phase, coalesce(v_title, 'Novo card'), p_values,
          coalesce((select max(position) from cards where phase_id = v_phase), 0) + 1000, 'public_form')
  returning id into v_card;
  return v_card;
end $$;

revoke all on function heartbeat() from public;
revoke all on function get_public_form(text) from public;
revoke all on function submit_public_form(text, jsonb) from public;
grant execute on function heartbeat() to anon, authenticated;
grant execute on function get_public_form(text) to anon, authenticated;
grant execute on function submit_public_form(text, jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Realtime: new cards appear live on the board
-- ─────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table cards;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table phases;
exception when duplicate_object then null; end $$;
