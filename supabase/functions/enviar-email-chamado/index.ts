// deno-lint-ignore-file no-explicit-any
import nodemailer from 'npm:nodemailer@6.9.16'

const SMTP_HOST = 'smtp.office365.com'
const SMTP_PORT = 587
const SMTP_USER = 'alef.silva@viasudeste.com'

const DEFAULT_RECIPIENTS = [
  'luiz.gabriel@viasudeste.com',
  'alef.silva@viasudeste.com',
  'maria.rodrigues@viasudeste.com',
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Método não permitido.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const secret = Deno.env.get('EMAIL_CTB')
    if (!secret) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Secret EMAIL_CTB não configurada.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'Payload inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Destinatários: string (vírgula/ponto-e-vírgula) ou array; vazio cai no padrão.
    const raw = body.destinatario ?? body.destinatarios
    let list: string[] = []
    if (typeof raw === 'string') {
      list = raw
        .split(/[,;]+/)
        .map((e: string) => e.trim())
        .filter(Boolean)
    } else if (Array.isArray(raw)) {
      list = raw.map((e: any) => String(e).trim()).filter(Boolean)
    }
    if (list.length === 0) list = [...DEFAULT_RECIPIENTS]
    // Dedup preservando ordem
    list = Array.from(new Set(list))

    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user: SMTP_USER, pass: secret },
      tls: { ciphers: 'SSLv3', rejectUnauthorized: false },
    })

    const isTeste = body.tipo === 'teste'
    const codigoExibicao = body.numero || body.codigo || ''
    const assunto = isTeste
      ? `[TESTE] Novo Chamado ${body.chamadoId || ''} — ${body.titulo || ''}`
      : `Anexo de Vale/Autorização de Desconto — Chamado ${codigoExibicao} — ${body.solicitante || body.criadoPor || 'Sistema'}`

    const html = body.html || montarHtml(body, isTeste)
    const text = body.text || montarTexto(body, isTeste)

    const info = await transport.sendMail({
      from: `"Helpdesk Avarias Via Sudeste" <${SMTP_USER}>`,
      to: list.join(', '),
      subject: assunto,
      html,
      text,
    })

    return new Response(
      JSON.stringify({ ok: true, messageId: info.messageId, destinatarios: list, subject: assunto }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('enviar-email-chamado erro:', err)
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Erro inesperado no envio do e-mail.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function linhaBloco(rotulo: string, valor: string): string {
  return `
    <tr>
      <td style="padding:6px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-left:4px solid #065F46;border-radius:4px;">
          <tr>
            <td style="padding:10px 12px;">
              <div style="font-size:10px;font-weight:bold;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">${esc(rotulo)}</div>
              <div style="font-size:14px;color:#111827;line-height:1.5;">${valor || '—'}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function celula(rotulo: string, valor: string): string {
  return `
      <td width="50%" valign="top" style="padding:6px 6px 6px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-left:4px solid #065F46;border-radius:4px;">
          <tr>
            <td style="padding:10px 12px;">
              <div style="font-size:10px;font-weight:bold;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">${esc(rotulo)}</div>
              <div style="font-size:14px;color:#111827;line-height:1.5;">${valor || '—'}</div>
            </td>
          </tr>
        </table>
      </td>`
}

function montarHtml(b: any, isTeste: boolean): string {
  const carro = b.carro || b.numeroCarro || ''
  const status = b.statusChamado || b.status || ''
  const quemNome = b.anexadoPorNome || b.criadoPor || b.solicitante || ''
  const quemEmail = b.anexadoPorEmail || b.criadoPorEmail || ''
  const documento = b.documento || (b.tipoChamado ? String(b.tipoChamado) : 'Vale/Autorização de Desconto')
  const quando = b.anexadoEm || b.dataSolicitacao || ''
  const quandoFmt = quando ? formatarDataHora(quando) : ''
  const link = b.linkChamado || (b.chamadoId ? `https://sinistro.viasudeste.com/dashboard/chamados/${b.chamadoId}` : '')

  return `
  <div style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:16px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="background:#065F46;padding:20px 24px;">
              <div style="font-size:18px;font-weight:bold;color:#ffffff;">Novo Anexo — Vale / Autorização de Desconto</div>
              <div style="font-size:13px;color:#d1fae5;margin-top:4px;">Helpdesk Avarias Via Sudeste</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ecfdf5;padding:12px 24px;border-bottom:1px solid #d1fae5;">
              <span style="font-size:12px;font-weight:bold;color:#065F46;text-transform:uppercase;letter-spacing:1px;">${esc(isTeste ? 'TESTE' : 'Vale / Autorização de Desconto')}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 14px 0;font-size:14px;color:#374151;line-height:1.6;">
                Olá,<br />
                Um anexo de <strong>${esc(documento)}</strong> foi adicionado ao chamado abaixo, que está com o status <strong>${esc(status || '—')}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${linhaBloco('Chamado', esc(b.titulo ? `${b.titulo}${b.pia ? ' (PIA ' + b.pia + ')' : ''}` : b.pia ? `PIA ${b.pia}` : codigoExibicao))}
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${celula('Carro', esc(carro))}
                        ${celula('Status do Chamado', esc(status))}
                      </tr>
                      <tr>
                        ${celula('Documento Anexado', esc(documento))}
                        ${celula('Quando', esc(quandoFmt))}
                      </tr>
                    </table>
                  </td>
                </tr>
                ${linhaBloco('Anexado por', esc(quemEmail ? `${quemNome} (${quemEmail})` : quemNome))}
                ${b.observacoes ? linhaBloco('Observações', esc(b.observacoes)) : ''}
                ${
                  link
                    ? `
                <tr>
                  <td style="padding:10px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;">
                      <tr>
                        <td style="padding:14px 12px;" align="center">
                          <a href="${link}" style="display:inline-block;background:#065F46;color:#ffffff;font-size:13px;font-weight:bold;padding:10px 22px;border-radius:6px;text-decoration:none;">Ver chamado no Helpdesk</a>
                          <div style="margin-top:8px;font-size:11px;color:#6b7280;word-break:break-all;">${link}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
                    : ''
                }
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;">
              <div style="font-size:11px;color:#9ca3af;line-height:1.5;">
                Esta é uma mensagem automática enviada pelo Helpdesk Avarias Via Sudeste. Não responda este e-mail.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </div>`
}

function montarTexto(b: any, isTeste: boolean): string {
  const carro = b.carro || b.numeroCarro || ''
  const status = b.statusChamado || b.status || ''
  const quemNome = b.anexadoPorNome || b.criadoPor || b.solicitante || ''
  const quemEmail = b.anexadoPorEmail || b.criadoPorEmail || ''
  const documento = b.documento || (b.tipoChamado ? String(b.tipoChamado) : 'Vale/Autorização de Desconto')
  const quando = b.anexadoEm || b.dataSolicitacao || ''
  const quandoFmt = quando ? formatarDataHora(quando) : ''
  const link = b.linkChamado || (b.chamadoId ? `https://sinistro.viasudeste.com/dashboard/chamados/${b.chamadoId}` : '')
  const titulo = b.titulo ? `${b.titulo}${b.pia ? ` (PIA ${b.pia})` : ''}` : b.pia ? `PIA ${b.pia}` : codigoExibicao

  return [
    isTeste ? '[TESTE] ' : '',
    `Novo anexo de ${documento} no chamado: ${titulo}`,
    '',
    `Carro: ${carro || '—'}`,
    `Status do chamado: ${status || '—'}`,
    `Documento anexado: ${documento}`,
    `Anexado por: ${quemNome}${quemEmail ? ` (${quemEmail})` : ''}`,
    `Quando: ${quandoFmt || '—'}`,
    b.observacoes ? `Observações: ${b.observacoes}` : '',
    '',
    link ? `Ver chamado: ${link}` : '',
    '',
    '— E-mail automático do Helpdesk Avarias Via Sudeste. Não responda.',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

function formatarDataHora(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}
