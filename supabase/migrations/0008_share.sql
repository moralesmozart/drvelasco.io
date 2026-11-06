-- Public bucket for the link-preview image (upload it as share/preview.jpg, 1200×630).
insert into storage.buckets (id, name, public)
values ('share', 'share', true)
on conflict (id) do update set public = true;
