import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

export default function FormularioEspelhoDanos() {
  const { id } = useParams<{ id: string }>()
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
    if (!id) return
    setLoading(true)
    try {
      const espelhoId = crypto.randomUUID()

      const { error: espelhoError } = await supabase
        .from('formularios_espelho_danos')
        .insert({ id: espelhoId, chamado_id: id, ...values })

      if (espelhoError) throw new Error('Erro ao salvar os dados do formulário')

      let pdfBlob: Blob
      try {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Espelho de Danos', 20, 20)

        doc.setFontSize(12)
        doc.text(`Número de OS: ${values.numero_os}`, 20, 40)
        doc.text(`Garagem: ${values.garagem}`, 20, 50)
        doc.text(`Data e Horário: ${values.data} às ${values.horario}`, 20, 60)
        doc.text(`Ocorrência: ${values.ocorrencia}`, 20, 70)
        doc.text(`Linha: ${values.linha}`, 20, 80)

        doc.text('Descrição dos danos:', 20, 100)
        const splitDescricao = doc.splitTextToSize(values.descricao_danos, 170)
        doc.text(splitDescricao, 20, 110)

        const yAfterDesc = 110 + splitDescricao.length * 7 + 10
        doc.text(
          `Vistoriador: ${values.nome_vistoriador} (Registro: ${values.registro_vistoriador})`,
          20,
          yAfterDesc,
        )
        doc.text(
          `Motorista: ${values.nome_motorista} (Registro: ${values.registro_motorista})`,
          20,
          yAfterDesc + 10,
        )
        doc.text(`Criado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 20, yAfterDesc + 30)

        pdfBlob = doc.output('blob')
      } catch (err) {
        throw new Error('Erro ao gerar documento. Tente novamente')
      }

      const fileName = `ESPELHO_DE_DANOS_${espelhoId}.pdf`
      const filePath = `chamado-${id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('anexos_chamados_interno')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) throw new Error('Erro ao salvar documento. Tente novamente')

      const { data: publicUrlData } = supabase.storage
        .from('anexos_chamados_interno')
        .getPublicUrl(filePath)

      const { error: rpcError } = await (supabase.rpc as any)('registrar_espelho_danos', {
        p_chamado_id: id,
        p_nome_arquivo: fileName,
        p_arquivo_url: publicUrlData.publicUrl,
        p_tamanho_bytes: pdfBlob.size,
      })

      if (rpcError) throw new Error('Erro ao registrar documento. Tente novamente')

      toast({ title: 'Sucesso', description: 'Formulário enviado com sucesso' })
      navigate('/espelho-danos/sucesso')
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
