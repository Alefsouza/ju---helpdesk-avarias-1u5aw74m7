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

    const { origem_id } = await req.json()

    if (!origem_id) {
      throw new Error('Chamado de origem não informado')
    }

    // Verify caller permissions: Only admin is allowed to un-unify
    const { data: profile } = await supabaseAdmin
      .from('perfil_usuario')
      .select('nome_completo, tipo_usuario')
      .eq('id', user.id)
      .single()

    if (profile?.tipo_usuario !== 'admin') {
      throw new Error('Acesso negado: apenas administradores podem desunificar chamados.')
    }

    // Fetch the origin ticket (the one with status='unificado')
    const { data: origem, error: origemError } = await supabaseAdmin
      .from('chamados')
      .select('*')
      .eq('id', origem_id)
      .single()

    if (origemError || !origem) {
      throw new Error('Chamado de origem não encontrado.')
    }

    if (origem.status !== 'unificado') {
      throw new Error(
        `O chamado informado não possui status "unificado" (status atual: "${origem.status}").`,
      )
    }

    // Identify target ticket (destino)
    let destinoId: string | null = origem.unificado_em_chamado_id || null

    if (!destinoId && origem.descricao) {
      const match = origem.descricao.match(
        /\[SISTEMA\]: Este chamado foi unificado com o chamado destino #([0-9a-fA-F\-]{36})/i,
      )
      if (match && match[1]) {
        destinoId = match[1]
      }
    }

    // If still not identified, search in historico_chamado of other tickets
    if (!destinoId) {
      const shortOrigemId = origem_id.substring(0, 8)
      const { data: histDestino } = await supabaseAdmin
        .from('historico_chamado')
        .select('chamado_id, detalhes')
        .ilike('detalhes', `%${shortOrigemId}%`)
        .order('criado_em', { ascending: false })
        .limit(1)

      if (histDestino && histDestino.length > 0) {
        destinoId = histDestino[0].chamado_id
      }
    }

    if (!destinoId) {
      throw new Error(
        'Não foi possível identificar o chamado destino ao qual este chamado foi unificado.',
      )
    }

    // Fetch destination ticket
    const { data: destino, error: destinoError } = await supabaseAdmin
      .from('chamados')
      .select('*')
      .eq('id', destino_id)
      .single()

    if (destinoError || !destino) {
      throw new Error('Chamado de destino não encontrado no sistema.')
    }

    // --- REVERT ITEMS ---
    const movedItemsSummary = {
      anexos_chamado_interno: 0,
      anexos_chamado: 0,
      documentos: 0,
      formularios_espelho_danos: 0,
      formularios_ido: 0,
      respostas_chamado: 0,
      historico_chamado: 0,
    }

    // Extract identifiers/heuristics from origin
    // 1. Explicit link: chamado_origem_id === origem_id
    // 2. OS number: from origem.titulo or origem.numero_os
    const osCandidates: string[] = []
    if (origem.numero_os) osCandidates.push(origem.numero_os.trim())
    const titleOsMatch = origem.titulo?.match(/OS\s*([0-9]+)/i)
    if (titleOsMatch && titleOsMatch[1]) {
      osCandidates.push(titleOsMatch[1].trim())
    }

    // 1. Revert anexos_chamado_interno
    const { data: anexosInternosDestino } = await supabaseAdmin
      .from('anexos_chamado_interno')
      .select('*')
      .eq('chamado_id', destinoId)

    const anexosInternosToMove: string[] = []
    if (anexosInternosDestino) {
      for (const anexo of anexosInternosDestino) {
        // Condition A: explicitly marked
        if (anexo.chamado_origem_id === origem_id) {
          anexosInternosToMove.push(anexo.id)
          continue
        }
        // Condition B: storage URL contains origem_id
        if (anexo.arquivo_url && anexo.arquivo_url.includes(origem_id)) {
          anexosInternosToMove.push(anexo.id)
          continue
        }
        // Condition C: OS number match in filename or URL
        if (osCandidates.length > 0) {
          const matchOs = osCandidates.some(
            (os) =>
              (anexo.nome_arquivo && anexo.nome_arquivo.includes(os)) ||
              (anexo.arquivo_url && anexo.arquivo_url.includes(os)),
          )
          // Make sure it doesn't match destination's own OS
          const matchesDestinoOs =
            destino.numero_os && anexo.nome_arquivo?.includes(destino.numero_os)
          if (matchOs && !matchesDestinoOs) {
            anexosInternosToMove.push(anexo.id)
          }
        }
      }
    }

    if (anexosInternosToMove.length > 0) {
      const { error: moveAnexosError } = await supabaseAdmin
        .from('anexos_chamado_interno')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', anexosInternosToMove)

      if (moveAnexosError) throw moveAnexosError
      movedItemsSummary.anexos_chamado_interno = anexosInternosToMove.length
    }

    // 2. Revert anexos_chamado
    const { data: anexosDestino } = await supabaseAdmin
      .from('anexos_chamado')
      .select('*')
      .eq('chamado_id', destinoId)

    const anexosToMove: string[] = []
    if (anexosDestino) {
      for (const anexo of anexosDestino) {
        if (anexo.chamado_origem_id === origem_id) {
          anexosToMove.push(anexo.id)
          continue
        }
        if (anexo.url_arquivo && anexo.url_arquivo.includes(origem_id)) {
          anexosToMove.push(anexo.id)
          continue
        }
      }
    }

    if (anexosToMove.length > 0) {
      await supabaseAdmin
        .from('anexos_chamado')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', anexosToMove)
      movedItemsSummary.anexos_chamado = anexosToMove.length
    }

    // 3. Revert documentos
    const { data: documentosDestino } = await supabaseAdmin
      .from('documentos')
      .select('*')
      .eq('chamado_id', destinoId)

    const documentosToMove: string[] = []
    if (documentosDestino) {
      for (const doc of documentosDestino) {
        // Never move destination's own documents: BO, CNH, CRLV
        const isCoreDestinoDoc =
          doc.tipo_documento === 'Boletim de Ocorrência' ||
          doc.tipo_documento === 'CNH' ||
          doc.tipo_documento === 'Documento do veículo'

        if (isCoreDestinoDoc && !doc.chamado_origem_id) {
          continue
        }

        if (doc.chamado_origem_id === origem_id) {
          documentosToMove.push(doc.id)
          continue
        }

        if (osCandidates.length > 0 && doc.numero_os) {
          if (osCandidates.includes(doc.numero_os.trim())) {
            documentosToMove.push(doc.id)
            continue
          }
        }

        if (osCandidates.length > 0 && doc.nome_arquivo) {
          const matchOs = osCandidates.some((os) => doc.nome_arquivo.includes(os))
          const matchesDestinoOs = destino.numero_os && doc.nome_arquivo.includes(destino.numero_os)
          if (matchOs && !matchesDestinoOs) {
            documentosToMove.push(doc.id)
            continue
          }
        }
      }
    }

    if (documentosToMove.length > 0) {
      const { error: moveDocsError } = await supabaseAdmin
        .from('documentos')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', documentosToMove)

      if (moveDocsError) throw moveDocsError
      movedItemsSummary.documentos = documentosToMove.length
    }

    // 4. Revert formularios_espelho_danos
    const { data: espelhosDestino } = await supabaseAdmin
      .from('formularios_espelho_danos')
      .select('*')
      .eq('chamado_id', destinoId)

    const espelhosToMove: string[] = []
    if (espelhosDestino) {
      for (const espelho of espelhosDestino) {
        if (espelho.chamado_origem_id === origem_id) {
          espelhosToMove.push(espelho.id)
          continue
        }
        if (osCandidates.length > 0 && espelho.numero_os) {
          if (osCandidates.includes(espelho.numero_os.trim())) {
            espelhosToMove.push(espelho.id)
            continue
          }
        }
      }
    }

    if (espelhosToMove.length > 0) {
      const { error: moveEspelhosError } = await supabaseAdmin
        .from('formularios_espelho_danos')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', espelhosToMove)

      if (moveEspelhosError) throw moveEspelhosError
      movedItemsSummary.formularios_espelho_danos = espelhosToMove.length
    }

    // 5. Revert formularios_ido
    const { data: idosDestino } = await supabaseAdmin
      .from('formularios_ido')
      .select('*')
      .eq('chamado_id', destinoId)

    const idosToMove: string[] = []
    if (idosDestino) {
      for (const ido of idosDestino) {
        if (ido.chamado_origem_id === origem_id) {
          idosToMove.push(ido.id)
        }
      }
    }

    if (idosToMove.length > 0) {
      await supabaseAdmin
        .from('formularios_ido')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', idosToMove)
      movedItemsSummary.formularios_ido = idosToMove.length
    }

    // 6. Revert respostas_chamado
    const { data: respostasDestino } = await supabaseAdmin
      .from('respostas_chamado')
      .select('*')
      .eq('chamado_id', destinoId)

    const respostasToMove: string[] = []
    if (respostasDestino) {
      for (const r of respostasDestino) {
        if (r.chamado_origem_id === origem_id) {
          respostasToMove.push(r.id)
          continue
        }
        // If created_at is strictly before the unification date and the user is the origin's creator
        if (
          origem.criado_em &&
          r.criado_em < origem.atualizado_em &&
          r.usuario_id === origem.usuario_id
        ) {
          // If destination's creator is different, this response belonged to the origin
          if (destino.usuario_id !== origem.usuario_id) {
            respostasToMove.push(r.id)
          }
        }
      }
    }

    if (respostasToMove.length > 0) {
      await supabaseAdmin
        .from('respostas_chamado')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', respostasToMove)
      movedItemsSummary.respostas_chamado = respostasToMove.length
    }

    // 7. Revert historico_chamado
    const { data: historicosDestino } = await supabaseAdmin
      .from('historico_chamado')
      .select('*')
      .eq('chamado_id', destinoId)

    const historicosToMove: string[] = []
    if (historicosDestino) {
      for (const h of historicosDestino) {
        if (h.chamado_origem_id === origem_id) {
          historicosToMove.push(h.id)
          continue
        }
        // Heuristic: matching OS in details
        if (osCandidates.length > 0 && h.detalhes) {
          const matchOs = osCandidates.some((os) => h.detalhes.includes(os))
          // Do not move the transfer event itself that describes the unification of origem into destino
          const isTransferLog =
            h.acao === 'transferido' && h.detalhes?.includes('foi unificado a este chamado')
          if (matchOs && !isTransferLog) {
            historicosToMove.push(h.id)
          }
        }
      }
    }

    if (historicosToMove.length > 0) {
      await supabaseAdmin
        .from('historico_chamado')
        .update({
          chamado_id: origem_id,
          chamado_origem_id: null,
        })
        .in('id', historicosToMove)
      movedItemsSummary.historico_chamado = historicosToMove.length
    }

    // --- RESTAURAR DESCRIÇÕES ---
    // 1. Origem: remover o sufixo [SISTEMA]: Este chamado foi unificado...
    let descricaoRestauradaOrigem =
      origem.descricao_original ||
      origem.descricao?.replace(
        /\n*\s*\[SISTEMA\]: Este chamado foi unificado com o chamado destino #([0-9a-fA-F\-]{36})(?:\.)?/gi,
        '',
      ) ||
      ''

    // Limpar espaços extras
    descricaoRestauradaOrigem = descricaoRestauradaOrigem.trim()

    // 2. Destino: remover o trecho adicionado da origem (geralmente após '---')
    let descricaoDestinoAtual = destino.descricao || ''
    // Buscar onde o texto da origem foi incorporado
    if (descricaoRestauradaOrigem) {
      // Padrões comuns: "\n\n---\n\nDescrição do Vistoriador: <origem.descricao>" ou "\n\n---\n\n<origem.descricao>"
      const regexPrefixes = [
        `\\n*\\s*---\\s*\\n*Descrição do Vistoriador:\\s*${escapeRegExp(descricaoRestauradaOrigem)}`,
        `\\n*\\s*---\\s*\\n*Descrição do COC:\\s*${escapeRegExp(descricaoRestauradaOrigem)}`,
        `\\n*\\s*---\\s*\\n*Descrição de Terceiro:\\s*${escapeRegExp(descricaoRestauradaOrigem)}`,
        `\\n*\\s*---\\s*\\n*${escapeRegExp(descricaoRestauradaOrigem)}`,
        `\\n*\\s*---\\s*\\n*Descrição do Vistoriador:\\s*${escapeRegExp(origem.descricao.trim())}`,
        `\\n*\\s*---\\s*\\n*${escapeRegExp(origem.descricao.trim())}`,
      ]

      let cleaned = false
      for (const p of regexPrefixes) {
        try {
          const re = new RegExp(p, 'i')
          if (re.test(descricaoDestinoAtual)) {
            descricaoDestinoAtual = descricaoDestinoAtual.replace(re, '').trim()
            cleaned = true
            break
          }
        } catch {
          // Ignore invalid regex
        }
      }

      if (!cleaned && descricaoDestinoAtual.includes('---')) {
        // Tentar buscar por pedaço do texto
        const chunks = descricaoDestinoAtual.split(/\n*\s*---\s*\n*/)
        if (chunks.length > 1) {
          const filteredChunks = chunks.filter((chunk) => {
            const chunkNormalized = chunk.toLowerCase().replace(/\s+/g, ' ')
            const origemNormalized = descricaoRestauradaOrigem.toLowerCase().replace(/\s+/g, ' ')
            return !chunkNormalized.includes(origemNormalized)
          })
          if (filteredChunks.length > 0 && filteredChunks.length < chunks.length) {
            descricaoDestinoAtual = filteredChunks.join('\n\n---\n\n').trim()
          }
        }
      }
    }

    // --- ATUALIZAR STATUS DOS CHAMADOS ---
    // Origem volta para 'finalizado' com status_aprovacao_alex = 'pendente' (fluxo normal para recebimento de vale)
    const { error: updateOrigemError } = await supabaseAdmin
      .from('chamados')
      .update({
        status: 'finalizado',
        status_aprovacao_alex: origem.status_aprovacao_alex || 'pendente',
        descricao: descricaoRestauradaOrigem,
        unificado_em_chamado_id: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', origem_id)

    if (updateOrigemError) throw updateOrigemError

    // Destino: apenas atualiza a descrição limpa e timestamp, mantendo seu status atual
    const { error: updateDestinoError } = await supabaseAdmin
      .from('chamados')
      .update({
        descricao: descricaoDestinoAtual,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', destinoId)

    if (updateDestinoError) throw updateDestinoError

    // --- REGISTRAR NO HISTÓRICO ---
    const adminNome = profile?.nome_completo || 'Administrador'

    // Histórico no chamado de origem
    await supabaseAdmin.from('historico_chamado').insert({
      chamado_id: origem_id,
      acao: 'reaberto',
      usuario_id: user.id,
      detalhes: `Chamado desunificado do chamado destino #${destinoId.substring(0, 8)} por ${adminNome}. Registros, documentação e anexos devolvidos ao chamado de origem. Status definido como Finalizado.`,
    })

    // Histórico no chamado de destino
    await supabaseAdmin.from('historico_chamado').insert({
      chamado_id: destinoId,
      acao: 'transferido',
      usuario_id: user.id,
      detalhes: `Chamado "${origem.titulo}" (ID: ${origem_id.substring(0, 8)}) foi desunificado deste chamado por ${adminNome}. Os registros correspondentes foram devolvidos ao chamado de origem.`,
    })

    return new Response(
      JSON.stringify({
        success: true,
        destino_id: destinoId,
        destino_titulo: destino.titulo,
        moved_items: movedItemsSummary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
