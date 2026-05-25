import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, UploadCloud } from 'lucide-react'

const formSchema = z.object({
  descricao: z.string().min(5, 'A descrição é obrigatória'),
  registro_motorista: z.string().min(1, 'Obrigatório'),
  nome_motorista: z.string().min(1, 'Obrigatório'),
  registro_cobrador: z.string().min(1, 'Obrigatório'),
  nome_cobrador: z.string().min(1, 'Obrigatório'),
  carro: z.string().min(1, 'Obrigatório'),
  linha: z.string().min(1, 'Obrigatório'),
  local_ocorrencia: z.string().min(1, 'Obrigatório'),
  operacao: z.enum(['RA', 'RN', 'OPN'], { required_error: 'Selecione uma operação' }),
  avarias: z.enum(['Vítima com avarias', 'Vítima sem avarias'], {
    required_error: 'Selecione uma opção',
  }),
})

export default function NovoChamadoCoc() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '',
      registro_motorista: '',
      nome_motorista: '',
      registro_cobrador: '',
      nome_cobrador: '',
      carro: '',
      linha: '',
      local_ocorrencia: '',
      operacao: undefined,
      avarias: undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return

    if (!file) {
      toast.error('O anexo é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      // Lookup garage in frota_veiculos
      const { data: veiculo } = await supabase
        .from('frota_veiculos' as any)
        .select('garagem')
        .eq('prefixo', values.carro)
        .maybeSingle()

      const garagemEncontrada = veiculo?.garagem || null
      const statusChamado = garagemEncontrada ? 'aberto' : 'pendente'

      if (!garagemEncontrada) {
        toast.warning('Veículo não encontrado na frota. Chamado criado como Pendente.')
      }

      const tituloChamado = `${values.avarias} - Carro: ${values.carro}`

      const insertData: any = {
        usuario_id: user.id,
        titulo: tituloChamado,
        descricao: values.descricao,
        status: statusChamado,
        registro_motorista: values.registro_motorista,
        nome_motorista: values.nome_motorista,
        registro_cobrador: values.registro_cobrador,
        nome_cobrador: values.nome_cobrador,
        carro: values.carro,
        linha: values.linha,
        local_ocorrencia: values.local_ocorrencia,
        operacao: values.operacao,
        tipo_chamado: values.avarias,
      }

      if (garagemEncontrada) {
        insertData.garagem = garagemEncontrada
      }

      // 1. Create ticket
      const { data: chamado, error: chamadoError } = await supabase
        .from('chamados')
        .insert(insertData)
        .select()
        .single()

      if (chamadoError) throw chamadoError

      // 2. Upload file
      const fileExt = file.name.split('.').pop() || 'dat'
      const fileName = `${chamado.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('anexos').upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('anexos').getPublicUrl(fileName)

      // 3. Save attachment
      const mappedTipo = file.type || 'application/octet-stream'

      const { error: anexoError } = await supabase.from('anexos_chamado').insert({
        chamado_id: chamado.id,
        url_arquivo: publicUrlData.publicUrl,
        nome_arquivo: file.name,
        tipo_arquivo: mappedTipo,
        tamanho_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
      })

      if (anexoError) throw anexoError

      toast.success('Chamado enviado com sucesso!')
      form.reset()
      setFile(null)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar chamado. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <Card>
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-2xl text-[#225f3d]">Abrir Chamado</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para registrar um novo chamado.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registro_motorista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Motorista</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 12345" {...field} />
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
                      <FormLabel>Nome do Motorista</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registro_cobrador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro do Cobrador</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 54321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome_cobrador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cobrador</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carro</FormLabel>
                      <FormControl>
                        <Input placeholder="Número do carro" {...field} />
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
                      <FormLabel>Linha</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 101 - Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="local_ocorrencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local da Ocorrência</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço ou referência" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operações</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RA">RA</SelectItem>
                          <SelectItem value="RN">RN</SelectItem>
                          <SelectItem value="OPN">OPN</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avarias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avarias?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Vítima com avarias">Vítima com avarias</SelectItem>
                          <SelectItem value="Vítima sem avarias">Vítima sem avarias</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva os detalhes do chamado"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Anexo (Obrigatório)</FormLabel>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setFile(f)
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">
                      {file
                        ? file.name
                        : 'Clique para selecionar ou arraste o arquivo (PDF, Imagem)'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="bg-[#225f3d] hover:bg-[#1a4a2f] w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Chamado'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
