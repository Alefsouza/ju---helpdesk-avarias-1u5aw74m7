import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, UploadCloud, X, File as FileIcon } from 'lucide-react'

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
  colisao: z.enum(['Sim', 'Não'], {
    required_error: 'Selecione uma opção',
  }),
})

export default function NovoChamadoCoc() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
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
      colisao: undefined as unknown as 'Sim' | 'Não',
    },
  })

  const carro = form.watch('carro')
  const [garagemIdentificada, setGaragemIdentificada] = useState<string | null>(null)
  const [isVerificandoCarro, setIsVerificandoCarro] = useState(false)

  useEffect(() => {
    async function verificarCarro() {
      if (!carro || carro.trim().length < 2) {
        setGaragemIdentificada(null)
        return
      }
      setIsVerificandoCarro(true)
      try {
        const { data } = await supabase
          .from('frota_veiculos' as any)
          .select('garagem')
          .eq('prefixo', carro.trim())
          .maybeSingle()

        setGaragemIdentificada(data?.garagem || null)
      } catch (err) {
        console.error(err)
      } finally {
        setIsVerificandoCarro(false)
      }
    }
    const timer = setTimeout(verificarCarro, 500)
    return () => clearTimeout(timer)
  }, [carro])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return

    if (files.length === 0) {
      toast.error('Pelo menos um anexo é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      // Lookup garage in frota_veiculos
      const { data: veiculo } = await supabase
        .from('frota_veiculos' as any)
        .select('garagem')
        .eq('prefixo', values.carro.trim())
        .maybeSingle()

      const garagemEncontrada = veiculo?.garagem || garagemIdentificada || null
      const statusChamado = garagemEncontrada ? 'aberto' : 'pendente'

      if (!garagemEncontrada) {
        toast.warning('Veículo não encontrado na frota. Chamado criado como Pendente.')
      }

      const tituloChamado =
        values.colisao === 'Sim'
          ? `Houve Vítima - Com colisão - Carro: ${values.carro}`
          : `Houve Vítima - Sem Colisão - Carro: ${values.carro}`

      const insertData: any = {
        usuario_id: user.id,
        titulo: tituloChamado,
        descricao: values.descricao,
        status: statusChamado,
        prioridade: 'urgente',
        registro_motorista: values.registro_motorista,
        nome_motorista: values.nome_motorista,
        registro_cobrador: values.registro_cobrador,
        nome_cobrador: values.nome_cobrador,
        carro: values.carro,
        linha: values.linha,
        local_ocorrencia: values.local_ocorrencia,
        operacao: values.operacao,
        tipo_chamado: values.colisao === 'Sim' ? 'Com colisão' : 'Sem colisão',
        data_ocorrencia: new Date().toISOString().split('T')[0],
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

      // 2. Upload files and save attachments
      for (const f of files) {
        const fileExt = f.name.split('.').pop() || 'dat'
        const fileName = `${chamado.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from('anexos').upload(fileName, f)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('anexos').getPublicUrl(fileName)

        const mappedTipo = f.type || 'application/octet-stream'

        const { error: anexoError } = await supabase.from('anexos_chamado').insert({
          chamado_id: chamado.id,
          url_arquivo: publicUrlData.publicUrl,
          nome_arquivo: f.name,
          tipo_arquivo: mappedTipo,
          tamanho_mb: Number((f.size / (1024 * 1024)).toFixed(2)),
        })

        if (anexoError) throw anexoError
      }

      toast.success('Chamado enviado com sucesso!')
      form.reset()
      setFiles([])
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
                      {isVerificandoCarro ? (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Verificando frota...
                        </p>
                      ) : carro && carro.trim().length >= 2 ? (
                        garagemIdentificada ? (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            Garagem identificada: {garagemIdentificada}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 font-medium mt-1">
                            Carro não encontrado. Chamado ficará como Pendente.
                          </p>
                        )
                      ) : null}
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
                  name="colisao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Houve colisão?</FormLabel>
                      <FormControl>
                        <div className="flex gap-6 pt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="colisao-sim"
                              checked={field.value === 'Sim'}
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange('Sim')
                                else if (field.value === 'Sim') field.onChange(undefined)
                              }}
                            />
                            <label
                              htmlFor="colisao-sim"
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              Sim
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="colisao-nao"
                              checked={field.value === 'Não'}
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange('Não')
                                else if (field.value === 'Não') field.onChange(undefined)
                              }}
                            />
                            <label
                              htmlFor="colisao-nao"
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              Não
                            </label>
                          </div>
                        </div>
                      </FormControl>
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
                <FormLabel>Anexos (Obrigatório)</FormLabel>
                <div
                  className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
                    }
                  }}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)])
                        // Reset the input value so the same file can be selected again if removed
                        e.target.value = ''
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">
                      Clique para selecionar ou arraste arquivos (PDF, Imagem)
                    </span>
                    <span className="text-xs text-slate-500">
                      {files.length} arquivo(s) selecionado(s)
                    </span>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((f, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 border rounded-md"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-slate-700 truncate">
                              {f.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {(f.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-slate-500 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
