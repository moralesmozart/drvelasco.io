-- Translations for user-defined content (e.g. { "es": { "label": "...", "description": "...", "options": [...] } }).
-- Stored values always use the original option text; translations only change what is displayed.
alter table fields add column if not exists translations jsonb not null default '{}'::jsonb;
alter table phases add column if not exists translations jsonb not null default '{}'::jsonb;
