import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'
import { corsHeaders } from '../_shared/cors.ts'

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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const {
      id,
      garagem,
      linha,
      data,
      horario,
      ocorrencia,
      descricao_danos,
      numero_os,
      responsavel,
    } = body

    if (!id || !numero_os) {
      throw new Error('ID e Número da OS são obrigatórios')
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = height - 50
    const marginX = 50

    const drawText = (text: string, isBold = false, size = 12) => {
      page.drawText(text, {
        x: marginX,
        y,
        size,
        font: isBold ? boldFont : font,
        color: rgb(0, 0, 0),
      })
      y -= size + 10
    }

    drawText('Espelho de Danos - Vistoria', true, 20)
    y -= 10
    drawText(`Numero da OS: ${numero_os || '-'}`, true, 14)
    y -= 10
    drawText(`Garagem: ${garagem || '-'}`)
    drawText(`Linha: ${linha || '-'}`)
    drawText(`Data/Horario: ${data || '-'} ${horario || '-'}`)
    drawText(`Vistoriador: ${responsavel || '-'}`)
    drawText(`Ocorrencia Confirmada: ${ocorrencia || '-'}`)
    y -= 15
    drawText('Descricao dos Danos:', true, 14)

    // Split description into multiple lines to avoid overflow
    const desc = descricao_danos || 'Nenhuma descricao fornecida.'
    const words = desc.split(' ')
    let line = ''
    for (const word of words) {
      if ((line + word).length > 80) {
        drawText(line, false, 12)
        line = word + ' '
      } else {
        line += word + ' '
      }
    }
    if (line) drawText(line, false, 12)

    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const fileName = `espelho_danos_${id}_${Date.now()}.pdf`
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error: uploadError } = await supabaseAdmin.storage
      .from('vistorias')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('vistorias').getPublicUrl(fileName)

    return new Response(JSON.stringify({ success: true, url: publicUrl, nome_arquivo: fileName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
