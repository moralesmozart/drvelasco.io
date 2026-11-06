-- Run ONLY after the "submit-form" Edge Function is deployed and the site has VITE_TURNSTILE_SITE_KEY
-- (and after 0007_family.sql). From then on the public form can only be submitted through the function.
revoke execute on function submit_public_form(text, jsonb, text, jsonb, boolean) from anon, authenticated;
grant execute on function submit_public_form(text, jsonb, text, jsonb, boolean) to service_role;
