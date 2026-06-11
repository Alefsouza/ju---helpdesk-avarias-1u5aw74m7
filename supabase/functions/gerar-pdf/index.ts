import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Footer } from 'npm:docx@8.5.0'

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
    if (!authHeader) throw new Error('Falha na autenticação: Authorization header ausente.')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Auth Error:', authError)
      throw new Error('Falha na autenticação: Token JWT inválido ou expirado.')
    }

    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error('JSON Parse Error:', e)
      throw new Error('Payload JSON inválido')
    }

    if (!body || typeof body !== 'object') {
      throw new Error('Payload body deve ser um objeto JSON')
    }

    const {
      tipo_documento = 'espelho_danos',
      id,
      espelho_id,
      garagem,
      linha,
      numero_carro,
      data,
      horario,
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

    let final_nome_vistoriador = nome_vistoriador
    let final_registro_vistoriador = registro_vistoriador

    // Automated Inspector Data Fallback
    if (!final_nome_vistoriador || !final_registro_vistoriador) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('perfil_usuario')
          .select('nome_completo, registro')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching user profile for fallback:', profileError)
        } else if (profile) {
          if (!final_nome_vistoriador) final_nome_vistoriador = profile.nome_completo
          if (!final_registro_vistoriador) final_registro_vistoriador = profile.registro
        }
      } catch (err: any) {
        console.error('Exception while fetching user profile:', err)
      }
    }

    let fileName = ''
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .substring(0, 14)
    let fileBytes: Uint8Array
    let contentType = 'application/pdf'

    if (tipo_documento === 'Vale') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      const { data: espelho } = await supabaseAdmin
        .from('formularios_espelho_danos')
        .select('nome_motorista, registro_motorista')
        .eq('chamado_id', id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      let placa = body.placa
      if (!placa && body.carro) {
        try {
          const { data: frota } = await supabaseAdmin
            .from('frota_veiculos')
            .select('placa')
            .eq('prefixo', body.carro)
            .maybeSingle()
          if (frota?.placa) placa = frota.placa
        } catch (e) {
          console.error('Error fetching frota placa', e)
        }
      }

      const dt = new Date()
      const dateStr = dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      const timeStr = dt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })

      const valorBase = body.valor_base || 0
      const valorFinal = body.valor_final || body.valor_orcamento || 0
      const parcelas = parseInt(body.parcelas || '1', 10)

      const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

      const createTextRow = (label: string, value: string) => {
        return new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 36 }),
            new TextRun({ text: value, size: 36 }),
          ],
          spacing: { after: 200 },
        })
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Gerado em: ${dateStr} às ${timeStr}`, size: 24 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
            },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'AUTORIZAÇÃO DE DESCONTO', bold: true, size: 52 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 800 },
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Informações do Sinistro', bold: true, size: 44 })],
                spacing: { after: 400 },
              }),
              createTextRow('Nome', espelho?.nome_motorista || '-'),
              createTextRow('Registro', espelho?.registro_motorista || '-'),
              createTextRow('Garagem', body.garagem || '-'),
              createTextRow('Registro da Ocorrência', body.pia || '-'),
              createTextRow('Veículo', body.carro || '-'),
              createTextRow('Placa', placa || '-'),

              new Paragraph({
                children: [new TextRun({ text: 'Informações Financeiras', bold: true, size: 44 })],
                spacing: { before: 600, after: 400 },
              }),
              createTextRow('Valor Original', formatCurrency(valorBase)),
              ...(body.com_desconto
                ? [
                    createTextRow(
                      'Desconto Aplicado',
                      `10% (-${formatCurrency(valorBase - valorFinal)})`,
                    ),
                  ]
                : []),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Valor Final: ', bold: true, size: 36 }),
                  new TextRun({ text: formatCurrency(valorFinal), bold: true, size: 36 }),
                ],
                spacing: { after: 200 },
              }),

              new Paragraph({
                children: [new TextRun({ text: 'Plano de Pagamento', bold: true, size: 44 })],
                spacing: { before: 600, after: 400 },
              }),
              createTextRow('Quantidade de Parcelas', `${parcelas}x`),
              ...Array.from(
                { length: parcelas },
                (_, i) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `  Parcela ${i + 1}/${parcelas}: ${formatCurrency(valorFinal / parcelas)}`,
                        size: 36,
                      }),
                    ],
                    spacing: { after: 200 },
                  }),
              ),

              new Paragraph({ spacing: { before: 1600 } }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '___________________________________________________',
                    size: 36,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Assinatura do Colaborador', bold: true, size: 32 }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 1600 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: '___________________________________________________',
                    size: 36,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Assinatura da Testemunha', bold: true, size: 32 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          },
        ],
      })

      const b64 = await Packer.toBase64String(doc)
      fileBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      fileName = `Autorizacao_Desconto_${id}_${timestamp}.docx`
    } else {
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

      if (tipo_documento === 'IDO') {
        drawText('Boletim de Ocorrência (IDO)', true, 20)
        y -= 10
        drawText(`Protocolo: ${protocolo_ido || '-'}`, true, 14)
        y -= 10
        drawText(
          `Colaborador: ${colaborador_nome || '-'} (Registro: ${colaborador_registro || '-'})`,
        )

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

        if (body.assinatura_base64) {
          y -= 20
          drawText('Assinatura Digital:', true, 12)
          try {
            const base64Data = body.assinatura_base64.split(',')[1] || body.assinatura_base64
            const isPng = body.assinatura_base64.includes('png')
            const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
            let pdfImage
            if (isPng) {
              pdfImage = await pdfDoc.embedPng(imgBytes)
            } else {
              pdfImage = await pdfDoc.embedJpg(imgBytes)
            }
            const imgDims = pdfImage.scaleToFit(150, 100)

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
            y -= imgDims.height + 10
          } catch (err) {
            console.error('Failed to embed signature', err)
          }
        }

        fileName = `ido_${id}_${timestamp}.pdf`
      } else {
        drawText('Espelho de Danos - Vistoria', true, 20)
        y -= 10
        drawText(`Número da OS: ${numero_os || '-'}`, true, 14)
        y -= 10
        drawText(`Garagem: ${garagem || '-'}`)
        drawText(`Linha: ${linha || '-'} / Carro: ${numero_carro || '-'}`)
        drawText(`Data/Horário: ${data || '-'} ${horario || '-'}`)
        drawText(
          `Vistoriador: ${final_nome_vistoriador || '-'} (Registro: ${final_registro_vistoriador || '-'})`,
        )
        drawText(`Motorista: ${nome_motorista || '-'} (Registro: ${registro_motorista || '-'})`)

        y -= 15
        drawText('Descrição dos Danos:', true, 14)

        const desc = descricao_danos || 'Nenhuma descrição fornecida.'
        drawMultilineText(desc, false, 12)

        // Add Photos
        if (fotos && Array.isArray(fotos) && fotos.length > 0) {
          y -= 20
          drawText('Fotos da Vistoria:', true, 14)

          for (let i = 0; i < fotos.length; i++) {
            const fotoUrl = fotos[i]
            try {
              const imgRes = await fetch(fotoUrl)
              if (!imgRes.ok) {
                console.error(`Failed to fetch image: ${imgRes.status} ${imgRes.statusText}`)
                continue
              }
              const imgBytes = await imgRes.arrayBuffer()

              let pdfImage
              const contentTypeHeader = imgRes.headers.get('content-type') || ''
              const isPng =
                fotoUrl.toLowerCase().includes('.png') || contentTypeHeader.includes('png')

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

        const numCarro = numero_carro || 'S-N'
        const numOS = numero_os || 'S-N'
        fileName = `Espelho_Danos_Carro_${numCarro}_OS_${numOS}_${timestamp}.pdf`
      }

      try {
        fileBytes = await pdfDoc.save()
      } catch (err) {
        console.error('PDF Generation Error:', err)
        throw new Error('Falha ao gerar o arquivo PDF.')
      }
    }

    // Upload to Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const bucket = id ? 'anexos_chamados_interno' : 'documentos'
    let filePath = fileName
    if (id) {
      filePath = `${id}/${fileName}`
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBytes, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload Error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)

    if (espelho_id) {
      const { error: updateError } = await supabaseAdmin
        .from('documentos')
        .update({
          arquivo_url: publicUrl,
          nome_arquivo: fileName,
          atualizado_em: new Date().toISOString(),
        })
        .eq('formulario_id', espelho_id)

      if (updateError) {
        console.error('Failed to update documentos for espelho_id', updateError)
      }
    } else if (tipo_documento === 'IDO' && id) {
      const { error: updateError } = await supabaseAdmin
        .from('documentos')
        .update({
          arquivo_url: publicUrl,
          nome_arquivo: fileName,
          atualizado_em: new Date().toISOString(),
        })
        .eq('chamado_id', id)
        .eq('tipo_documento', 'IDO')

      if (updateError) {
        console.error('Failed to update documentos for IDO', updateError)
      }
    }

    return new Response(JSON.stringify({ success: true, url: publicUrl, nome_arquivo: fileName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('gerar-pdf Error:', error)
    const status = error.message && error.message.includes('autenticação') ? 401 : 400
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
