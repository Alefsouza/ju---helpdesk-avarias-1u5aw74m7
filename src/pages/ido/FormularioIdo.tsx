import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { SignaturePad } from '@/components/SignaturePad'
import { jsPDF } from 'jspdf'

const testemunhaSchema = z
  .object({
    nome: z.string().optional(),
    endereco: z.string().optional(),
    rg: z.string().optional(),
    telefone: z.string().optional(),
  })
  .refine(
    (data) => {
      const values = [data.nome, data.endereco, data.rg, data.telefone].filter(
        (v) => v !== undefined && v.trim() !== '',
      )
      return values.length === 0 || values.length === 4
    },
    {
      message: 'Preencha todos os campos da testemunha',
      path: ['nome'],
    },
  )

const formSchema = z.object({
  protocolo_ido: z.string().min(1, 'Protocolo é obrigatório'),
  colaborador_nome: z.string().min(1, 'Nome é obrigatório'),
  colaborador_registro: z.string().min(1, 'Registro é obrigatório'),
  assinatura_base64: z.string().min(1, 'Assinatura é obrigatória'),
  testemunha_1: testemunhaSchema,
  testemunha_2: testemunhaSchema,
  testemunha_3: testemunhaSchema,
})

type FormValues = z.infer<typeof formSchema>

export default function FormularioIdo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      protocolo_ido: '',
      colaborador_nome: '',
      colaborador_registro: '',
      assinatura_base64: '',
      testemunha_1: { nome: '', endereco: '', rg: '', telefone: '' },
      testemunha_2: { nome: '', endereco: '', rg: '', telefone: '' },
      testemunha_3: { nome: '', endereco: '', rg: '', telefone: '' },
    },
  })

  const generatePDFDoc = async (data: FormValues) => {
    const doc = new jsPDF()

    let logoBase64 = null
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.src = '/image-019dff11-886e-74db-932e-be9cefd195ef.png'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      logoBase64 = canvas.toDataURL('image/png')
    } catch (e) {
      console.error('Failed to load logo', e)
    }

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 25
    const contentWidth = pageWidth - margin * 2
    let y = margin

    const drawHeader = () => {
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 20, 20, 25, 12)
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(43, 43, 43)
      doc.text('DADOS DO BOLETIM DE OCORRÊNCIA', 50, 28)
      y = 45
    }

    const checkPageBreak = (neededSpace: number) => {
      if (y + neededSpace > pageHeight - 35) {
        doc.addPage()
        drawHeader()
      }
    }

    const drawField = (title: string, value: string | undefined | null) => {
      if (!value) return

      const titleHeight = 4
      const spaceBetween = 2
      const lineSpacing = 4

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(43, 43, 43)

      const splitValue = doc.splitTextToSize(String(value), contentWidth)
      const valueHeight = splitValue.length * lineSpacing

      checkPageBreak(titleHeight + spaceBetween + valueHeight + 8)

      doc.text(title, margin, y)
      y += spaceBetween + 4

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(splitValue, margin, y)
      y += (splitValue.length - 1) * lineSpacing + 8
    }

    drawHeader()

    drawField('Protocolo do BO/TOKEN:', data.protocolo_ido)
    drawField('Nome do colaborador:', data.colaborador_nome)
    drawField('Registro do colaborador:', data.colaborador_registro)

    const drawTestemunha = (num: number, t: any) => {
      if (t && t.nome) {
        drawField(`Testemunha ${num} - Nome:`, t.nome)
        drawField(`Testemunha ${num} - Endereço:`, t.endereco)
        drawField(`Testemunha ${num} - SG:`, t.rg)
        drawField(`Testemunha ${num} - Telefone:`, t.telefone)
      }
    }

    drawTestemunha(1, data.testemunha_1)
    drawTestemunha(2, data.testemunha_2)
    drawTestemunha(3, data.testemunha_3)

    if (data.assinatura_base64) {
      checkPageBreak(30 + 8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(43, 43, 43)
      doc.text('Assinatura Digital:', margin, y)
      y += 6
      try {
        doc.addImage(data.assinatura_base64, 'PNG', margin, y, 50, 30)
        y += 30 + 8
      } catch (e) {
        console.error('Failed to add signature image', e)
      }
    }

    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const dateStr = new Date().toLocaleString('pt-BR')
      doc.setDrawColor(224, 224, 224)
      doc.setLineWidth(0.5)
      doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text(`Data e hora de criação: ${dateStr}`, margin, pageHeight - 25 + 5)

      const pageStr = `Página ${i} de ${totalPages}`
      const textWidth = doc.getTextWidth(pageStr)
      doc.text(pageStr, pageWidth - margin - textWidth, pageHeight - 25 + 5)
    }

    return doc
  }

  const onSubmit = async (data: FormValues) => {
    if (!id) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('formularios_ido').insert({
        chamado_id: id,
        protocolo_ido: data.protocolo_ido,
        colaborador_nome: data.colaborador_nome,
        colaborador_registro: data.colaborador_registro,
        assinatura_base64: data.assinatura_base64,
        testemunha_1_nome: data.testemunha_1.nome || null,
        testemunha_1_endereco: data.testemunha_1.endereco || null,
        testemunha_1_sg: data.testemunha_1.rg || null,
        testemunha_1_telefone: data.testemunha_1.telefone || null,
        testemunha_2_nome: data.testemunha_2.nome || null,
        testemunha_2_endereco: data.testemunha_2.endereco || null,
        testemunha_2_sg: data.testemunha_2.rg || null,
        testemunha_2_telefone: data.testemunha_2.telefone || null,
        testemunha_3_nome: data.testemunha_3.nome || null,
        testemunha_3_endereco: data.testemunha_3.endereco || null,
        testemunha_3_sg: data.testemunha_3.rg || null,
        testemunha_3_telefone: data.testemunha_3.telefone || null,
      })

      if (error) throw new Error('Erro ao salvar formulário.')

      let pdfBlob: Blob
      try {
        const doc = await generatePDFDoc(data)
        pdfBlob = doc.output('blob')
      } catch (err) {
        console.error(err)
        throw new Error('Erro ao gerar documento. Tente novamente')
      }

      const fileName = `DADOS_DO_BOLETIM_ELETRONICO_${Date.now()}.pdf`
      const filePath = `chamado-${id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error(uploadError)
        throw new Error('Erro ao salvar documento. Tente novamente')
      }

      const { data: urlData } = supabase.storage
        .from('anexos_chamados_interno')
        .getPublicUrl(filePath)

      const { error: rpcError } = await supabase.rpc('registrar_boletim_ido' as any, {
        p_chamado_id: id,
        p_nome_arquivo: fileName,
        p_arquivo_url: urlData.publicUrl,
        p_tamanho_bytes: pdfBlob.size,
      })

      if (rpcError) {
        console.error(rpcError)
        throw new Error('Erro ao registrar documento. Tente novamente')
      }

      toast({
        title: 'Sucesso',
        description: 'Documento salvo com sucesso!',
      })
      navigate('/ido/sucesso', { state: { chamadoId: id, fileName, tipo: 'IDO' } })
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Erro ao enviar formulário. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-3xl py-8 md:py-12 mx-auto px-4">
      <Card>
        <CardHeader>
          <CardTitle>DADOS DO BOLETIM DE OCORRENCIA&nbsp;</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para registrar as informações vinculadas ao chamado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados do Colaborador</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="protocolo_ido">
                    Protocolo ou TOKEN do BO&nbsp;<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="protocolo_ido"
                    placeholder="Informe o número de protocolo"
                    {...form.register('protocolo_ido')}
                  />
                  {form.formState.errors.protocolo_ido && (
                    <span className="text-sm text-destructive">
                      {form.formState.errors.protocolo_ido.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colaborador_nome">
                    Nome do colaborador <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="colaborador_nome"
                    placeholder="Informe seu nome completo"
                    {...form.register('colaborador_nome')}
                  />
                  {form.formState.errors.colaborador_nome && (
                    <span className="text-sm text-destructive">
                      {form.formState.errors.colaborador_nome.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="colaborador_registro">
                    Registro do colaborador <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="colaborador_registro"
                    placeholder="Informe seu número de registro"
                    {...form.register('colaborador_registro')}
                  />
                  {form.formState.errors.colaborador_registro && (
                    <span className="text-sm text-destructive">
                      {form.formState.errors.colaborador_registro.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Testemunhas (Opcional)</h3>
              <p className="text-sm text-muted-foreground">
                Você pode adicionar até 3 testemunhas. Se preencher uma testemunha, todos os seus
                campos tornam-se obrigatórios.
              </p>

              {[1, 2, 3].map((num) => {
                const prefix = `testemunha_${num}` as const
                const errorObj = form.formState.errors[prefix] as any
                const rootError = errorObj?.nome?.message

                return (
                  <div key={num} className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">Testemunha {num}</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Nome da testemunha"
                          {...form.register(`${prefix}.nome`)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Endereço</Label>
                        <Input
                          placeholder="Endereço da testemunha"
                          {...form.register(`${prefix}.endereco`)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>RG</Label>
                        <Input placeholder="RG da testemunha" {...form.register(`${prefix}.rg`)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          placeholder="Telefone da testemunha"
                          {...form.register(`${prefix}.telefone`)}
                        />
                      </div>
                    </div>
                    {rootError && <p className="text-sm text-destructive">{rootError}</p>}
                  </div>
                )
              })}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Assinatura Digital <span className="text-destructive">*</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Assine no quadro abaixo usando o mouse ou o dedo.
              </p>

              <Controller
                control={form.control}
                name="assinatura_base64"
                render={({ field, fieldState }) => (
                  <SignaturePad onChange={field.onChange} error={fieldState.error?.message} />
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar formulário'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
