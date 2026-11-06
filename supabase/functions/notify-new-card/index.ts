// Sends a short email when a new request arrives. No form answers are included, only the name and a link.
// Secrets: RESEND_API_KEY, NOTIFY_TO, NOTIFY_SECRET, APP_URL (e.g. https://user.github.io/repo/), optional NOTIFY_FROM.
// Deploy with "Verify JWT" turned off: requests are authenticated by the x-notify-secret header.

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) return new Response('Forbidden', { status: 403 })

  const { card_id, pipe_id, title } = await req.json()
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/?$/, '/')
  const link = `${appUrl}#/pipe/${pipe_id}?card=${card_id}`
  const name = String(title ?? '').replace(/[<>&"]/g, '')

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1e293b">
      <p style="font-size:13px;color:#2c6a5a;font-weight:600;margin:0 0 8px">Nova solicitação · Nueva solicitud</p>
      <h1 style="font-size:22px;margin:0 0 16px">${name}</h1>
      <p style="margin:0 0 24px;color:#475569">Um novo formulário acabou de chegar. Abra o card para ver os detalhes.</p>
      <a href="${link}" style="display:inline-block;background:#25775f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">Abrir card</a>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFY_FROM') ?? 'drvelasco <onboarding@resend.dev>',
      to: (Deno.env.get('NOTIFY_TO') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      subject: `Nova solicitação: ${name}`,
      html,
    }),
  })
  return new Response(await res.text(), { status: res.ok ? 200 : 502 })
})
