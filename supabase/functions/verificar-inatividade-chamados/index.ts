import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Chama a function do banco de dados que executa a lógica de inatividade
    const { error } = await supabaseAdmin.rpc('marcar_chamados_pendentes_por_inatividade')

    if (error) {
      console.error('Erro ao executar rpc marcar_chamados_pendentes_por_inatividade:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verificação de inatividade concluída com sucesso.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
