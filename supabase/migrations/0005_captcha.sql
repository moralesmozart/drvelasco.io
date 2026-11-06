-- Run ONLY after the "submit-form" Edge Function is deployed and the site has VITE_TURNSTILE_SITE_KEY.
-- From then on the public form can only be submitted through the function, which checks the captcha.
revoke execute on function submit_public_form(text, jsonb, text) from anon, authenticated;
grant execute on function submit_public_form(text, jsonb, text) to service_role;
