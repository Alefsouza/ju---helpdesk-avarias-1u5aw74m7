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

    const { origem_id, destino_id } = await req.json()

    if (!origem_id || !destino_id) {
      throw new Error('Missing required fields')
    }

    if (origem_id === destino_id) {
      throw new Error('Origem and destino cannot be the same')
    }

    // Verify caller permissions
    const { data: profile } = await supabaseAdmin
      .from('perfil_usuario')
      .select('nome_completo, tipo_usuario')
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

    // Get source ticket
    const { data: origem, error: origemError } = await supabaseAdmin
      .from('chamados')
      .select('*')
      .eq('id', origem_id)
      .single()

    if (origemError || !origem) throw new Error('Chamado de origem não encontrado')

    // Get destination ticket
    const { data: destino, error: destinoError } = await supabaseAdmin
      .from('chamados')
      .select('*')
      .eq('id', destino_id)
      .single()

    if (destinoError || !destino) throw new Error('Chamado de destino não encontrado')

    // Data Integrity Protection: Safeguard specific fields
    // Ensure we do not overwrite the destination's primary context (pia, titulo, tipo_chamado, prioridade)
    // Only moving explicitly requested related tables.

    // Copy participants and original creator
    if (origem.usuario_id) {
      await supabaseAdmin.from('participantes_chamado').upsert(
        {
          chamado_id: destino_id,
          usuario_id: origem.usuario_id,
        },
        { onConflict: 'chamado_id, usuario_id' },
      )
    }

    const { data: sourceParticipants } = await supabaseAdmin
      .from('participantes_chamado')
      .select('usuario_id')
      .eq('chamado_id', origem_id)

    if (sourceParticipants && sourceParticipants.length > 0) {
      const inserts = sourceParticipants.map((p: any) => ({
        chamado_id: destino_id,
        usuario_id: p.usuario_id,
      }))
      await supabaseAdmin
        .from('participantes_chamado')
        .upsert(inserts, { onConflict: 'chamado_id, usuario_id' })
    }

    // Start data migration:
    // Update respostas_chamado
    await supabaseAdmin
      .from('respostas_chamado')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Update anexos_chamado
    await supabaseAdmin
      .from('anexos_chamado')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Update anexos_chamado_interno
    await supabaseAdmin
      .from('anexos_chamado_interno')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Update documentos (RA/PIA)
    await supabaseAdmin
      .from('documentos')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Update formularios_espelho_danos
    await supabaseAdmin
      .from('formularios_espelho_danos')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Update formularios_ido
    await supabaseAdmin
      .from('formularios_ido')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Update historico_chamado
    await supabaseAdmin
      .from('historico_chamado')
      .update({ chamado_id: destino_id })
      .eq('chamado_id', origem_id)

    // Mark origin as finalized/unified
    await supabaseAdmin
      .from('chamados')
      .update({
        status: 'finalizado',
        atualizado_em: new Date().toISOString(),
        descricao:
          origem.descricao +
          `\n\n[SISTEMA]: Este chamado foi unificado com o chamado destino #${destino_id}.`,
      })
      .eq('id', origem_id)

    // Update destination ticket status to 'em_atendimento' and update timestamp
    await supabaseAdmin
      .from('chamados')
      .update({
        status: 'em_atendimento',
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', destino_id)

    // Add history records to destination
    await supabaseAdmin.from('historico_chamado').insert([
      {
        chamado_id: destino_id,
        acao: 'transferido',
        usuario_id: user.id,
        detalhes: `O chamado "${origem.titulo}" (ID: ${origem_id.substring(0, 8)}) foi unificado a este chamado por ${profile.nome_completo}. Documentação e anexos migrados do chamado unificado ${origem_id.substring(0, 8)}.`,
      },
      {
        chamado_id: destino_id,
        acao: 'atribuido',
        usuario_id: user.id,
        detalhes:
          'Status alterado para Em Atendimento automaticamente após a unificação de registros.',
      },
    ])

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
