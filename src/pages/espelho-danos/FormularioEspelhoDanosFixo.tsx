import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const formSchema = z.object({
  numero_os: z.string().min(1, 'Campo obrigatório'),
  garagem: z.string().min(1, 'Selecione uma garagem'),
  data: z.string().min(1, 'Campo obrigatório'),
  horario: z.string().min(1, 'Campo obrigatório'),
  ocorrencia: z.string().min(1, 'Selecione sim ou não'),
  linha: z.string().min(1, 'Campo obrigatório'),
  descricao_danos: z.string().min(1, 'Campo obrigatório'),
  registro_vistoriador: z.string().min(1, 'Campo obrigatório'),
  nome_vistoriador: z.string().min(1, 'Campo obrigatório'),
  registro_motorista: z.string().min(1, 'Campo obrigatório'),
  nome_motorista: z.string().min(1, 'Campo obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

export default function FormularioEspelhoDanosFixo() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_os: '',
      garagem: '',
      data: '',
      horario: '',
      ocorrencia: '',
      linha: '',
      descricao_danos: '',
      registro_vistoriador: '',
      nome_vistoriador: '',
      registro_motorista: '',
      nome_motorista: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      let logoBase64: string | null = null
      try {
        const res = await fetch(
          'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/documentos/logo-via-sudeste.png',
        )
        if (res.ok) {
          const blob = await res.blob()
          logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              let result = reader.result as string
              if (!result.startsWith('data:image/')) {
                result = result.replace(/^data:[^;]+;base64,/, 'data:image/png;base64,')
              }
              resolve(result)
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        }
      } catch (err) {
        console.error('Erro ao carregar logo:', err)
      }

      let pdfBlob: Blob
      try {
        const doc = new jsPDF({ format: 'a4', unit: 'mm' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 25
        const contentWidth = pageWidth - 2 * margin
        let currentY = margin
        let pageNumber = 1

        const addHeader = () => {
          if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 20, 20, 25, 12)
          }

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(18)
          doc.setTextColor(43, 43, 43)
          doc.text('Espelho de Danos', pageWidth / 2, 28, { align: 'center' })

          currentY = 45
        }

        const addFooter = () => {
          const footerY = pageHeight - 25
          doc.setDrawColor(224, 224, 224)
          doc.setLineWidth(0.5)
          doc.line(25, footerY, pageWidth - 25, footerY)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          const dateStr = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`
          doc.text(dateStr, 25, footerY + 5)
        }

        addHeader()
        addFooter()

        const renderField = (title: string, value: string) => {
          doc.setFontSize(10)
          const lines = doc.splitTextToSize(value || '-', contentWidth)

          if (currentY + 10 > pageHeight - 30) {
            doc.addPage()
            pageNumber++
            addHeader()
            addFooter()
          }

          doc.setFont('helvetica', 'bold')
          doc.setTextColor(43, 43, 43)
          doc.text(title, margin, currentY)

          let currentLineY = currentY + 6

          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)

          for (let i = 0; i < lines.length; i++) {
            if (currentLineY > pageHeight - 30) {
              doc.addPage()
              pageNumber++
              addHeader()
              addFooter()
              currentLineY = currentY
            }
            doc.text(lines[i], margin, currentLineY)
            currentLineY += 4.2
          }

          currentY = currentLineY - 4.2 + 11
        }

        let dataFormatada = 'Data é obrigatória'
        if (values.data) {
          const parts = values.data.split('-')
          if (parts.length === 3) {
            dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`
          } else {
            dataFormatada = 'Data inválida'
          }
        }

        renderField('Número de OS', values.numero_os)
        renderField('Garagem', values.garagem)
        renderField('Data', dataFormatada)
        renderField('Horário', values.horario)
        renderField('Ocorrência', values.ocorrencia)
        renderField('Linha', values.linha)
        renderField('Descrição dos Danos', values.descricao_danos)
        renderField('Registro do Vistoriador', values.registro_vistoriador)
        renderField('Nome do Vistoriador', values.nome_vistoriador)
        renderField('Registro do Motorista', values.registro_motorista)
        renderField('Nome do Motorista', values.nome_motorista)

        for (let i = 1; i <= pageNumber; i++) {
          doc.setPage(i)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          doc.text(`Página ${i} de ${pageNumber}`, pageWidth - 25, pageHeight - 25 + 5, {
            align: 'right',
          })
        }

        pdfBlob = doc.output('blob')
      } catch (err) {
        throw new Error('Erro ao gerar documento. Tente novamente')
      }

      const fileName = `ESPELHO_DE_DANOS_${Date.now()}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) throw new Error('Erro ao salvar documento. Tente novamente')

      const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(fileName)

      const { error: docError } = await supabase.from('documentos').insert({
        tipo_documento: 'Espelho de Danos',
        nome_arquivo: fileName,
        arquivo_url: publicUrlData.publicUrl,
        registro_responsavel: values.registro_vistoriador,
        nome_responsavel: values.nome_vistoriador,
        cargo_responsavel: 'Vistoriador',
        chamado_id: null,
      })

      if (docError) {
        console.error(docError)
        throw new Error('Erro ao registrar documento.')
      }

      toast({ title: 'Sucesso', description: 'Formulário enviado com sucesso' })
      navigate('/espelho-danos-fixo/sucesso', {
        state: { fileName, tipo: 'Espelho de Danos' },
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao enviar formulário. Tente novamente',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Espelho de Danos</CardTitle>
          <CardDescription>Preencha os dados da vistoria abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="numero_os"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de OS *</FormLabel>
                    <FormControl>
                      <Input placeholder="Informe o número de OS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="garagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garagem *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma garagem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cursino">Cursino</SelectItem>
                        <SelectItem value="Sapopemba">Sapopemba</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="ocorrencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ocorrência *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-6"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Sim" />
                          </FormControl>
                          <FormLabel className="font-normal">Sim</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Não" />
                          </FormControl>
                          <FormLabel className="font-normal">Não</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linha *</FormLabel>
                    <FormControl>
                      <Input placeholder="Informe o número da linha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descricao_danos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição dos Danos *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva os danos encontrados" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registro_vistoriador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Vistoriador *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o registro do vistoriador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome_vistoriador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Vistoriador *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o nome do vistoriador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registro_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Motorista *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o registro do motorista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Motorista *</FormLabel>
                      <FormControl>
                        <Input placeholder="Informe o nome do motorista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar formulário'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
