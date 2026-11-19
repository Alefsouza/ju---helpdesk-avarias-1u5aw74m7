import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// CORS amplo (chamada vem do front do HelpDesk e do Cérebro)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEGREDO = '6GXmBljlUQxEwbW7IUjiiJ3kcvQsBhHbERNtn2dHzVBEBb1EOvBE70QZis6nnNe0'
const CEREBRO_URL = 'https://cerebro-bcfb9.shrd01.internal.goskip.dev'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const ticket = String(body.ticket || '').trim()
    if (!ticket) {
      return new Response(JSON.stringify({ error: 'Ticket ausente.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. valida o ticket no banco do Cérebro (mesma secret)
    const trocaRes = await fetch(CEREBRO_URL + '/backend/v1/sso/trocar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket, segredo: SEGREDO }),
    })
    const troca = await trocaRes.json().catch(() => null)
    if (!trocaRes.ok || !troca?.email) {
      return new Response(
        JSON.stringify({ error: troca?.message || 'Ticket recusado pelo Cérebro.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const email = String(troca.email).toLowerCase()
    const nome = String(troca.nome || '')
    if (!email.endsWith('@viasudeste.com')) {
      return new Response(JSON.stringify({ error: 'E-mail fora da Via Sudeste.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. garante o usuário no Supabase Auth (service role)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } },
    )

    const { data: existente } = await admin.auth.admin.listUsers({ perPage: 1000 })
    let user = (existente?.users || []).find((u) => (u.email || '').toLowerCase() === email)

    if (!user) {
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
      let senha = ''
      for (let i = 0; i < 24; i++) senha += abc.charAt(Math.floor(Math.random() * abc.length))
      const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nome || 'Leandro Ferraz' },
      })
      if (erroCriar || !criado?.user) {
        return new Response(
          JSON.stringify({ error: 'Falha ao criar usuário: ' + (erroCriar?.message || '?') }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
      user = criado.user
    }

    // 3. gera link de login de uso único e troca por sessão real
    const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (erroLink || !link?.properties?.hashed_token) {
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar link: ' + (erroLink?.message || '?') }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const url =
      (Deno.env.get('SUPABASE_URL') || '') +
      '/auth/v1/verify?token=' +
      link.properties.hashed_token +
      '&type=magiclink&redirect_to=' +
      encodeURIComponent('https://helpdesk-cadastro-5422c.goskip.app/')
    const verifyRes = await fetch(url, { redirect: 'manual' })
    // GoTrue devolve 302 com token na query/fragment ou um JSON com a sessão
    const loc = verifyRes.headers.get('location') || ''
    const frag = loc.split('#')[1] || ''
    const qs = loc.split('?')[1] || ''
    const params = new URLSearchParams(qs + (frag ? '&' + frag : ''))
    const access = params.get('access_token') || ''
    const refresh = params.get('refresh_token') || ''

    if (!access) {
      // alguns projetos retornam JSON com session
      const j = await verifyRes.json().catch(() => null)
      const sess = j?.access_token ? j : j?.session
      if (sess?.access_token) {
        return new Response(JSON.stringify({ session: sess }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({ error: 'Verify não devolveu sessão (loc: ' + loc.slice(0, 120) + ')' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({ session: { access_token: access, refresh_token: refresh } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
