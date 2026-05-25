import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { chamado_id, novo_responsavel_id, observacao } = await req.json()

    if (!chamado_id || !novo_responsavel_id) {
      throw new Error('Missing required fields')
    }

    // Verify caller permissions
    const { data: profile } = await supabaseAdmin
      .from('perfil_usuario')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single()

    if (
      profile?.tipo_usuario !== 'admin' &&
      profile?.tipo_usuario !== 'responsavel' &&
      profile?.tipo_usuario !== 'sinistro' &&
      profile?.tipo_usuario !== 'juridico'
    ) {
      throw new Error(
        'Forbidden: Only admin, responsavel, sinistro, or juridico can perform this action',
      )
    }

    // Get current ticket
    const { data: chamado, error: chamadoError } = await supabaseAdmin
      .from('chamados')
      .select('responsavel_id, status')
      .eq('id', chamado_id)
      .single()

    if (chamadoError || !chamado) {
      throw new Error('Chamado not found')
    }

    // Check if the caller is the specific person responsible for the ticket
    if (chamado.responsavel_id !== user.id) {
      throw new Error('Forbidden: You are not the responsible for this ticket')
    }

    // Get new responsavel details
    const { data: novoResponsavel, error: novoRespError } = await supabaseAdmin
      .from('perfil_usuario')
      .select('nome_completo, departamento')
      .eq('id', novo_responsavel_id)
      .single()

    if (novoRespError || !novoResponsavel) {
      throw new Error('Novo responsável não encontrado')
    }

    // Update the ticket to change responsible
    const { error: updateError } = await supabaseAdmin
      .from('chamados')
      .update({
        responsavel_id: novo_responsavel_id,
        status_interno: novoResponsavel.departamento || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', chamado_id)

    if (updateError) throw updateError

    // Add history record
    const detalhes = observacao?.trim()
      ? `Transferido para ${novoResponsavel.nome_completo}. Motivo: ${observacao}`
      : `Transferido para ${novoResponsavel.nome_completo}.`

    const { error: historyError } = await supabaseAdmin.from('historico_chamado').insert({
      chamado_id,
      acao: 'transferido',
      usuario_id: user.id,
      detalhes,
    })

    if (historyError) {
      console.error('Error inserting history:', historyError)
      // Continue anyway as the main transfer was successful
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
