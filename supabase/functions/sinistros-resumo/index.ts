import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Rankings de sinistros para o Cérebro (pedido do dono, 23/11).
// Só contagens agregadas. Protegida pelo header X-Cerebro-Token.
//
// Linha do sinistro (regra do dono): o chamado tem o PREFIXO do carro
// (campo carro) e a linha vem da escala do dia na VW do Globus
// (prefixo_veiculo -> codigolinha). Fallback: espelho de danos / chamado.
// Motorista: espelho de danos (vistoriador) primeiro, chamado como fallback.
// PAGINAÇÃO: PostgREST devolve no máx 1.000 linhas por request — buscar em
// blocos com .range() até acabar (v2; a v1 subia o total errado).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, x-cerebro-token, content-type',
}

const TOKEN = 'l7YQdHEjPp0DETGaGG1xp_AkN5voyUqQXAuKwdsfM-s'
const ORDS = 'https://ords.skipsudeste.com.br/ords/globus/vw_cadlinhas_empresa_15/?limit=1000'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const tok = req.headers.get('x-cerebro-token') || ''
  if (!TOKEN || tok !== TOKEN) {
    return new Response(JSON.stringify({ error: 'token invalido' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } },
    )

    const fetchAll = async (table: string, select: string) => {
      const out: any[] = []
      const step = 1000
      for (let from = 0; from < 50000; from += step) {
        const { data, error } = await admin
          .from(table)
          .select(select)
          .range(from, from + step - 1)
        if (error) throw new Error(table + ': ' + error.message)
        const batch = data || []
        for (const b of batch) out.push(b)
        if (batch.length < step) break
      }
      return out
    }

    // Sinistro = tudo que não é Avaria (Colisão, Atropelamento, Vandalismo,
    // Queda do usuário, Lesão, Seguradora, Acidente Interno, sem tipo).
    const sins = await fetchAll(
      'chamados',
      'id,carro,garagem,tipo_chamado,nome_motorista,linha',
    ).then((rows) => rows.filter((c) => c.tipo_chamado !== 'Avaria' || c.tipo_chamado == null))

    const esp = await fetchAll('formularios_espelho_danos', 'chamado_id,nome_motorista,linha')

    const espMap: Record<string, { nome: string; linha: string }> = {}
    for (const f of esp) {
      if (f.chamado_id && !espMap[f.chamado_id]) {
        espMap[f.chamado_id] = {
          nome: String(f.nome_motorista || '').trim(),
          linha: String(f.linha || '').trim(),
        }
      }
    }

    // VW do Globus: prefixo (sem zeros à esquerda) -> codigo da linha
    const p2l: Record<string, string> = {}
    try {
      const r = await fetch(ORDS)
      if (r.ok) {
        const j = await r.json()
        const itens = Array.isArray(j) ? j : j.items || []
        for (const it of itens) {
          const p = String(it.prefixo_veiculo || '')
            .replace(/^0+/, '')
            .trim()
          const cod = String(it.codigolinha || '')
            .trim()
            .toUpperCase()
          if (p && cod && !p2l[p]) p2l[p] = cod
        }
      }
    } catch (_) {}

    const fmtLinha = (cod: string) => {
      const c = String(cod || '').toUpperCase()
      if (!c) return ''
      return /-/.test(c) || c.length < 3 ? c : c.slice(0, -2) + '-' + c.slice(-2)
    }
    const normLinha = (s: string) => {
      const u = String(s || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
      return u ? fmtLinha(u) : ''
    }
    const inc = (m: Record<string, number>, k: string) => {
      if (!k) return
      m[k] = (m[k] || 0) + 1
    }

    const porLinha: Record<string, number> = {}
    const porMot: Record<string, number> = {}
    const porCarro: Record<string, number> = {}
    const porGar: Record<string, number> = {}
    const porTipo: Record<string, number> = {}
    let comLinha = 0

    for (const c of sins) {
      inc(porTipo, String(c.tipo_chamado || 'Não informado').trim())
      inc(porGar, String(c.garagem || '').trim() || '(sem garagem)')
      const carro = String(c.carro || '')
        .replace(/^0+/, '')
        .trim()
      if (carro) inc(porCarro, carro)

      // linha: regra do dono — prefixo do carro cruzado com a VW; fallback
      // espelho de danos e depois o campo linha do próprio chamado
      let linha = carro && p2l[carro] ? fmtLinha(p2l[carro]) : ''
      if (!linha) linha = normLinha(espMap[c.id]?.linha || '')
      if (!linha) linha = normLinha(c.linha || '')
      if (linha) {
        inc(porLinha, linha)
        comLinha++
      }

      const mot = (espMap[c.id]?.nome || '').trim() || String(c.nome_motorista || '').trim()
      inc(porMot, mot || '(não identificado)')
    }

    const top = (m: Record<string, number>, n: number) =>
      Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
    const txt = (pares: [string, number][]) => pares.map(([k, v]) => k + ': ' + v).join('\n')

    const total = sins.length
    const pct = total ? Math.round((comLinha * 100) / total) : 0

    return new Response(
      JSON.stringify({
        quando: new Date().toISOString(),
        total_sinistros: total,
        por_linha_txt: txt(top(porLinha, 8)),
        por_motorista_txt: txt(top(porMot, 8)),
        por_carro_txt: txt(top(porCarro, 5)),
        por_garagem_txt: txt(top(porGar, 5)),
        por_tipo_txt: txt(top(porTipo, 6)),
        cobertura_txt:
          comLinha +
          ' de ' +
          total +
          ' sinistros com linha (' +
          pct +
          '%) — prefixo do carro cruzado com a escala do dia na VW do Globus',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
