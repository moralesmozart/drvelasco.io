// Public form submission with captcha (Cloudflare Turnstile).
// Secrets: TURNSTILE_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Deploy with "Verify JWT" turned off (the form is public; the captcha is the check).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const { slug, values, hp, token, family, holderNeeds } = await req.json().catch(() => ({}))
  if (!slug || typeof values !== 'object' || !token) return json({ error: 'bad_request' }, 400)

  const form = new FormData()
  form.append('secret', Deno.env.get('TURNSTILE_SECRET') ?? '')
  form.append('response', String(token))
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]
  if (ip) form.append('remoteip', ip)
  const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then((r) => r.json())
  if (!check.success) return json({ error: 'captcha_failed' }, 403)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await admin.rpc('submit_public_form', {
    p_slug: slug, p_values: values, p_hp: hp ?? '', p_family: Array.isArray(family) ? family : [], p_holder_needs: holderNeeds !== false,
  })
  if (error) return json({ error: error.message }, 400)
  return json({ id: data })
})
