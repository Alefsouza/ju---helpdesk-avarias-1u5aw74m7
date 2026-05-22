import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'

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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const {
      tipo_documento = 'espelho_danos',
      id,
      garagem,
      linha,
      numero_carro,
      data,
      horario,
      ocorrencia,
      descricao_danos,
      numero_os,
      nome_vistoriador,
      registro_vistoriador,
      nome_motorista,
      registro_motorista,
      fotos,
      protocolo_ido,
      colaborador_nome,
      colaborador_registro,
      testemunha_1_nome,
      testemunha_1_endereco,
      testemunha_1_sg,
      testemunha_1_telefone,
      testemunha_2_nome,
      testemunha_2_endereco,
      testemunha_2_sg,
      testemunha_2_telefone,
      testemunha_3_nome,
      testemunha_3_endereco,
      testemunha_3_sg,
      testemunha_3_telefone,
    } = body

    if (!id) {
      throw new Error('ID é obrigatório')
    }

    // Generate PDF
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = height - 50
    const marginX = 50

    const drawText = (text: string, isBold = false, size = 12) => {
      if (y < 50) {
        page = pdfDoc.addPage()
        y = height - 50
      }
      page.drawText(text, {
        x: marginX,
        y,
        size,
        font: isBold ? boldFont : font,
        color: rgb(0, 0, 0),
      })
      y -= size + 10
    }

    const drawMultilineText = (text: string, isBold = false, size = 12) => {
      const words = text.split(' ')
      let line = ''
      for (const word of words) {
        if ((line + word).length > 80) {
          drawText(line, isBold, size)
          line = word + ' '
        } else {
          line += word + ' '
        }
      }
      if (line) drawText(line, isBold, size)
    }

    let fileName = ''

    if (tipo_documento === 'IDO') {
      drawText('Boletim de Ocorrência (IDO)', true, 20)
      y -= 10
      drawText(`Protocolo: ${protocolo_ido || '-'}`, true, 14)
      y -= 10
      drawText(`Colaborador: ${colaborador_nome || '-'} (Registro: ${colaborador_registro || '-'})`)

      y -= 15
      drawText('Testemunha 1:', true, 14)
      drawText(`Nome: ${testemunha_1_nome || '-'} - SG: ${testemunha_1_sg || '-'}`)
      drawText(`Endereço: ${testemunha_1_endereco || '-'}`)
      drawText(`Telefone: ${testemunha_1_telefone || '-'}`)

      y -= 15
      drawText('Testemunha 2:', true, 14)
      drawText(`Nome: ${testemunha_2_nome || '-'} - SG: ${testemunha_2_sg || '-'}`)
      drawText(`Endereço: ${testemunha_2_endereco || '-'}`)
      drawText(`Telefone: ${testemunha_2_telefone || '-'}`)

      y -= 15
      drawText('Testemunha 3:', true, 14)
      drawText(`Nome: ${testemunha_3_nome || '-'} - SG: ${testemunha_3_sg || '-'}`)
      drawText(`Endereço: ${testemunha_3_endereco || '-'}`)
      drawText(`Telefone: ${testemunha_3_telefone || '-'}`)

      fileName = `ido_${id}_${Date.now()}.pdf`
    } else {
      drawText('Espelho de Danos - Vistoria', true, 20)
      y -= 10
      drawText(`Numero da OS: ${numero_os || '-'}`, true, 14)
      y -= 10
      drawText(`Garagem: ${garagem || '-'}`)
      drawText(`Linha: ${linha || '-'} / Carro: ${numero_carro || '-'}`)
      drawText(`Data/Horario: ${data || '-'} ${horario || '-'}`)
      drawText(`Vistoriador: ${nome_vistoriador || '-'} (Registro: ${registro_vistoriador || '-'})`)
      drawText(`Motorista: ${nome_motorista || '-'} (Registro: ${registro_motorista || '-'})`)
      drawText(`Ocorrencia Confirmada: ${ocorrencia || '-'}`)
      y -= 15
      drawText('Descricao dos Danos:', true, 14)

      const desc = descricao_danos || 'Nenhuma descricao fornecida.'
      drawMultilineText(desc, false, 12)

      // Add Photos
      if (fotos && Array.isArray(fotos) && fotos.length > 0) {
        y -= 20
        drawText('Fotos da Vistoria:', true, 14)

        for (let i = 0; i < fotos.length; i++) {
          const fotoUrl = fotos[i]
          try {
            const imgRes = await fetch(fotoUrl)
            if (!imgRes.ok) continue
            const imgBytes = await imgRes.arrayBuffer()

            let pdfImage
            const contentType = imgRes.headers.get('content-type') || ''
            const isPng = fotoUrl.toLowerCase().includes('.png') || contentType.includes('png')

            if (isPng) {
              pdfImage = await pdfDoc.embedPng(imgBytes)
            } else {
              pdfImage = await pdfDoc.embedJpg(imgBytes)
            }

            const imgDims = pdfImage.scaleToFit(width - marginX * 2, 250)

            if (y - imgDims.height < 50) {
              page = pdfDoc.addPage()
              y = height - 50
            }

            page.drawImage(pdfImage, {
              x: marginX,
              y: y - imgDims.height,
              width: imgDims.width,
              height: imgDims.height,
            })

            y -= imgDims.height + 20
          } catch (err) {
            console.error('Failed to embed image', fotoUrl, err)
          }
        }
      }

      fileName = `espelho_danos_${id}_${Date.now()}.pdf`
    }

    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const bucket = 'anexos_chamados_interno'
    const filePath = `${id}/${fileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload Error:', uploadError)
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)

    return new Response(JSON.stringify({ success: true, url: publicUrl, nome_arquivo: fileName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('gerar-pdf Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
