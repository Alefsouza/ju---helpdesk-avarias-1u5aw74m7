import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Espelhos de Danos -> Intranet ViaSudeste
 * GET /functions/v1/espelho-danos-intranet
 * Header: x-espelho-token: <token>
 *
 * Resposta PAGINADA (leve): limit (1-1000, default 200) + offset (default 0).
 * Todas as linhas são acessíveis paginando: offset += limit enquanto tem_mais = true.
 * Param opcional: atualizado_desde (ISO 8601) para sincronismo incremental por atualizado_em.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-espelho-token',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405)

  try {
    const token = req.headers.get('x-espelho-token') ?? ''
    if (!token) return json({ error: 'Token ausente' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: cfg, error: cfgError } = await admin
      .from('integra_intranet_config')
      .select('valor')
      .eq('chave', 'token_hash')
      .maybeSingle()
    if (cfgError || !cfg?.valor) {
      console.error('Config do token não encontrada:', cfgError)
      return json({ error: 'Erro de configuração' }, 500)
    }

    const hash = await sha256Hex(token)
    if (!safeEqual(hash, cfg.valor)) return json({ error: 'Token inválido' }, 401)

    const url = new URL(req.url)
    const desde = url.searchParams.get('atualizado_desde')
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 200) || 200, 1), 1000)
    const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0)

    // Contagem total do filtro (para o cliente paginar)
    let countQuery = admin
      .from('formularios_espelho_danos')
      .select('id', { count: 'exact', head: true })
    if (desde) countQuery = countQuery.gte('atualizado_em', desde)
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('Erro ao contar espelhos:', countError)
      return json({ error: 'Erro ao consultar dados' }, 500)
    }
    const totalGeral = count ?? 0

    let query = admin
      .from('formularios_espelho_danos')
      .select('id, numero_carro, linha, numero_os, garagem, data, horario, criado_em, atualizado_em, chamado_id')

    if (desde) {
      query = query.gte('atualizado_em', desde).order('atualizado_em', { ascending: true })
    } else {
      query = query.order('criado_em', { ascending: false })
    }

    const { data, error } = await query.range(offset, offset + limit - 1)
    if (error) {
      console.error('Erro ao consultar espelhos:', error)
      return json({ error: 'Erro ao consultar dados' }, 500)
    }

    const espelhos = (data ?? []).map((f) => ({
      id: f.id,
      prefixo: f.numero_carro,
      linha: f.linha,
      numero_os: f.numero_os,
      garagem: f.garagem,
      data: f.data,
      horario: f.horario,
      criado_em: f.criado_em,
      atualizado_em: f.atualizado_em,
      chamado_id: f.chamado_id,
    }))

    return json({
      total: espelhos.length,
      total_geral: totalGeral,
      offset,
      limit,
      tem_mais: offset + espelhos.length < totalGeral,
      espelhos,
    })
  } catch (e) {
    console.error('Erro em espelho-danos-intranet:', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
