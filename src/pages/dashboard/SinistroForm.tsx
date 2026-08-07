import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  UploadCloud,
  X,
  FileIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarIcon,
} from 'lucide-react'

const formSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  dataOcorrencia: z.any().refine((v) => v != null, 'Data obrigatória'),
  horaOcorrencia: z.string().min(1, 'Hora obrigatória'),
  placaOnibus: z
    .string()
    .min(1, 'Placa obrigatória')
    .length(8, 'Formato: ABC 1234')
    .regex(/^[A-Z]{3} [A-Z0-9]{4}$/, 'Formato inválido'),
  registroMotorista: z.string().min(1, 'Obrigatório'),
  nomeMotorista: z.string().min(1, 'Obrigatório'),
  registroCobrador: z.string().optional(),
  nomeCobrador: z.string().optional(),
  descricaoAcidente: z.string().min(20, 'Mínimo 20 caracteres'),
  t1Nome: z.string().optional(),
  t1Contato: z.string().optional(),
  t2Nome: z.string().optional(),
  t2Contato: z.string().optional(),
  t3Nome: z.string().optional(),
  t3Contato: z.string().optional(),
  terNome: z.string().optional(),
  terContato: z.string().optional(),
  terPlaca: z.string().optional(),
  terModelo: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

function FileUploadField({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  const inputId = `upload-${label.replace(/\s/g, '-').toLowerCase()}`
  const isOptional = label.toLowerCase().includes('opcional')
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {!isOptional && ' *'}
      </Label>
      {!file ? (
        <label
          htmlFor={inputId}
          className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer flex flex-col items-center gap-1 hover:border-primary/50 hover:bg-slate-50 transition-colors"
        >
          <UploadCloud className="h-6 w-6 text-slate-400" />
          <span className="text-xs text-muted-foreground">Clique para selecionar</span>
          <input
            id={inputId}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) onChange(e.target.files[0])
              e.target.value = ''
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-2 p-2.5 border rounded-md bg-white">
          <FileIcon className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 text-slate-400 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function SinistroForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [relatoCoc, setRelatoCoc] = useState<File | null>(null)
  const [relatoOperador, setRelatoOperador] = useState<File | null>(null)
  const [identifiedGaragem, setIdentifiedGaragem] = useState<string | null>(null)
  const [identifiedPrefixo, setIdentifiedPrefixo] = useState<string | null>(null)
  const [isSearchingPlaca, setIsSearchingPlaca] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: '',
      dataOcorrencia: undefined,
      horaOcorrencia: '',
      placaOnibus: '',
      registroMotorista: '',
      nomeMotorista: '',
      registroCobrador: '',
      nomeCobrador: '',
      descricaoAcidente: '',
      t1Nome: '',
      t1Contato: '',
      t2Nome: '',
      t2Contato: '',
      t3Nome: '',
      t3Contato: '',
      terNome: '',
      terContato: '',
      terPlaca: '',
      terModelo: '',
    },
  })

  const placaOnibus = form.watch('placaOnibus')
  const registroMotorista = form.watch('registroMotorista')
  const registroCobrador = form.watch('registroCobrador')

  useEffect(() => {
    if (!placaOnibus || placaOnibus.length !== 8) {
      setIdentifiedGaragem(null)
      setIdentifiedPrefixo(null)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingPlaca(true)
      try {
        const clean = placaOnibus.replace(/[^a-zA-Z0-9]/g, '')
        const { data, error } = await supabase.rpc(
          'buscar_veiculo_por_placa' as any,
          { p_placa: clean } as any,
        )
        if (error) throw error
        const result = data as { garagem: string; prefixo: string } | null
        if (result?.garagem) {
          setIdentifiedGaragem(result.garagem)
          setIdentifiedPrefixo(result.prefixo)
        } else {
          setIdentifiedGaragem('NOT_FOUND')
          setIdentifiedPrefixo(null)
        }
      } catch {
        setIdentifiedGaragem('NOT_FOUND')
        setIdentifiedPrefixo(null)
      } finally {
        setIsSearchingPlaca(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [placaOnibus])

  useEffect(() => {
    if (!registroMotorista?.trim()) return
    const timer = setTimeout(async () => {
      try {
        const normalized = registroMotorista.replace(/^0+/, '') || '0'
        const { data } = await supabase
          .from('registros')
          .select('nome')
          .eq('registro', normalized)
          .maybeSingle()
        if (data) form.setValue('nomeMotorista', data.nome, { shouldValidate: true })
      } catch {
        /* intentionally ignored */
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [registroMotorista, form])

  useEffect(() => {
    if (!registroCobrador?.trim()) return
    const timer = setTimeout(async () => {
      try {
        const normalized = registroCobrador.replace(/^0+/, '') || '0'
        const { data } = await supabase
          .from('registros')
          .select('nome')
          .eq('registro', normalized)
          .maybeSingle()
        if (data) form.setValue('nomeCobrador', data.nome, { shouldValidate: true })
      } catch {
        /* intentionally ignored */
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [registroCobrador, form])

  const onSubmit = async (values: FormValues) => {
    if (!user) return
    if (!relatoOperador) {
      toast.error('O anexo Relato Operador é obrigatório')
      return
    }
    if (isSearchingPlaca || !identifiedGaragem) {
      toast.error('Aguarde a validação do veículo.')
      return
    }
    if (identifiedGaragem === 'NOT_FOUND') {
      toast.error('Esse carro não pertence à frota da Via Sudeste.')
      return
    }
    setIsSubmitting(true)
    try {
      const testemunhas = [
        { nome: values.t1Nome || '', contato: values.t1Contato || '' },
        { nome: values.t2Nome || '', contato: values.t2Contato || '' },
        { nome: values.t3Nome || '', contato: values.t3Contato || '' },
      ]
      const descricao = `${values.descricaoAcidente}\n\nTestemunhas:\n${testemunhas.map((t) => `${t.nome || '-'} - ${t.contato || '-'}`).join('\n')}\n\nDados do Terceiro:\n${values.terNome || '-'} - ${values.terContato || '-'}\n${values.terPlaca || '-'} - ${values.terModelo || '-'}`

      const { data: chamado, error: chamadoError } = await supabase
        .from('chamados')
        .insert({
          titulo: values.titulo,
          descricao,
          tipo_chamado: 'Colisão',
          prioridade: null,
          usuario_id: user.id,
          responsavel_id: null,
          status: 'aberto',
          garagem: identifiedGaragem,
          carro: identifiedPrefixo,
          data_ocorrencia: format(new Date(values.dataOcorrencia), 'yyyy-MM-dd'),
          nome_motorista: values.nomeMotorista,
          registro_motorista: values.registroMotorista,
          nome_cobrador: values.nomeCobrador,
          registro_cobrador: values.registroCobrador,
          criado_em: new Date().toISOString(),
        } as any)
        .select()
        .single()
      if (chamadoError) throw chamadoError

      const attachmentsToUpload: [File, string][] = []
      if (relatoCoc) attachmentsToUpload.push([relatoCoc, 'Relato COC'])
      if (relatoOperador) attachmentsToUpload.push([relatoOperador, 'Relato Operador'])
      for (const [fileObj, label] of attachmentsToUpload) {
        const ext = fileObj.name.split('.').pop() || 'dat'
        const fileName = `${chamado.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('anexos_chamados_interno')
          .upload(fileName, fileObj)
        if (uploadError) throw uploadError
        const { data: pubData } = supabase.storage
          .from('anexos_chamados_interno')
          .getPublicUrl(fileName)
        const { error: anexoError } = await supabase.from('anexos_chamado_interno').insert({
          chamado_id: chamado.id,
          usuario_id: user.id,
          arquivo_url: pubData.publicUrl,
          nome_arquivo: `[${label}] ${fileObj.name}`,
          tamanho_bytes: fileObj.size,
          tipo_arquivo: fileObj.type || 'application/octet-stream',
        })
        if (anexoError) throw anexoError
      }

      await supabase
        .from('historico_chamado')
        .insert({ chamado_id: chamado.id, acao: 'criado', usuario_id: user.id })
      toast.success('Chamado aberto com sucesso')
      navigate(`/dashboard/chamados/${chamado.id}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao abrir chamado. Tente novamente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const errors = form.formState.errors

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up p-4 mb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Abrir Novo Chamado</h1>
        <p className="text-muted-foreground mt-2">Preencha os dados da ocorrência.</p>
      </div>
      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Dados Principais</h2>
              <div className="space-y-2 scroll-mt-24">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Colisão na lateral direita"
                  {...form.register('titulo')}
                />
                {errors.titulo && <p className="text-sm text-red-500">{errors.titulo.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Ocorrência *</Label>
                  <Controller
                    control={form.control}
                    name="dataOcorrencia"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'justify-start text-left font-normal w-full',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              field.value instanceof Date ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                format(new Date(field.value), 'PPP', { locale: ptBR })
                              )
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value
                                ? field.value instanceof Date
                                  ? field.value
                                  : new Date(field.value)
                                : undefined
                            }
                            onSelect={field.onChange}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.dataOcorrencia && (
                    <p className="text-sm text-red-500">
                      {errors.dataOcorrencia.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaOcorrencia">Hora da Ocorrência *</Label>
                  <Input id="horaOcorrencia" type="time" {...form.register('horaOcorrencia')} />
                  {errors.horaOcorrencia && (
                    <p className="text-sm text-red-500">{errors.horaOcorrencia.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="placaOnibus">Placa do nosso ônibus *</Label>
                <Controller
                  control={form.control}
                  name="placaOnibus"
                  render={({ field }) => (
                    <Input
                      id="placaOnibus"
                      placeholder="Ex: ABC 1234"
                      value={field.value}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                        if (v.length > 3) v = v.substring(0, 3) + ' ' + v.substring(3, 7)
                        field.onChange(v)
                      }}
                      maxLength={8}
                    />
                  )}
                />
                {errors.placaOnibus && (
                  <p className="text-sm text-red-500">{errors.placaOnibus.message}</p>
                )}
                {isSearchingPlaca && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando veículo...
                  </p>
                )}
                {!isSearchingPlaca && identifiedGaragem === 'NOT_FOUND' && (
                  <p className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> Esse carro não pertence à frota da Via
                    Sudeste.
                  </p>
                )}
                {!isSearchingPlaca && identifiedGaragem && identifiedGaragem !== 'NOT_FOUND' && (
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" /> Veículo identificado: Garagem{' '}
                    {identifiedGaragem}
                    {identifiedPrefixo && ` - Carro: ${identifiedPrefixo}`}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registroMotorista">Registro Motorista *</Label>
                  <Input
                    id="registroMotorista"
                    placeholder="Ex: 12345"
                    {...form.register('registroMotorista')}
                  />
                  {errors.registroMotorista && (
                    <p className="text-sm text-red-500">{errors.registroMotorista.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeMotorista">Nome Motorista *</Label>
                  <Input
                    id="nomeMotorista"
                    placeholder="Nome completo"
                    {...form.register('nomeMotorista')}
                  />
                  {errors.nomeMotorista && (
                    <p className="text-sm text-red-500">{errors.nomeMotorista.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registroCobrador">Registro Cobrador</Label>
                  <Input
                    id="registroCobrador"
                    placeholder="Ex: 54321"
                    {...form.register('registroCobrador')}
                  />
                  {errors.registroCobrador && (
                    <p className="text-sm text-red-500">{errors.registroCobrador.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeCobrador">Nome Cobrador</Label>
                  <Input
                    id="nomeCobrador"
                    placeholder="Nome completo"
                    {...form.register('nomeCobrador')}
                  />
                  {errors.nomeCobrador && (
                    <p className="text-sm text-red-500">{errors.nomeCobrador.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricaoAcidente">Descrição do Acidente *</Label>
                <Textarea
                  id="descricaoAcidente"
                  placeholder="Descreva detalhadamente o acidente..."
                  className="min-h-[120px]"
                  {...form.register('descricaoAcidente')}
                />
                {errors.descricaoAcidente && (
                  <p className="text-sm text-red-500">{errors.descricaoAcidente.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadField
                  label="Relato COC (Opcional)"
                  file={relatoCoc}
                  onChange={setRelatoCoc}
                />
                <FileUploadField
                  label="Relato Operador"
                  file={relatoOperador}
                  onChange={setRelatoOperador}
                />
              </div>
            </div>

            <div className="space-y-4 pt-12 border-t mt-12">
              <h2 className="text-lg font-semibold text-slate-800">Testemunhas</h2>
              {[1, 2, 3].map((i) => {
                const nomeKey = `t${i}Nome` as keyof FormValues
                const contatoKey = `t${i}Contato` as keyof FormValues
                return (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input placeholder="Nome da testemunha" {...form.register(nomeKey)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contato</Label>
                      <Input placeholder="Telefone ou e-mail" {...form.register(contatoKey)} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-4 pt-12 border-t mt-12">
              <h2 className="text-lg font-semibold text-slate-800">Dados do Terceiro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Nome do terceiro" {...form.register('terNome')} />
                </div>
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Input placeholder="Telefone ou e-mail" {...form.register('terContato')} />
                </div>
                <div className="space-y-2">
                  <Label>Placa Veículo</Label>
                  <Input placeholder="Ex: DEF 5678" {...form.register('terPlaca')} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo/Marca</Label>
                  <Input placeholder="Ex: Honda Civic 2020" {...form.register('terModelo')} />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 bg-slate-50/50 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/meus-chamados')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSearchingPlaca || identifiedGaragem === 'NOT_FOUND'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo...
                </>
              ) : (
                'Abrir Chamado'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
