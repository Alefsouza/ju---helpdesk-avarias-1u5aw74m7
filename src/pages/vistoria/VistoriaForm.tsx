import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, X, Loader2, ImagePlus } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import logoColorido from '@/assets/whatsapp-image-2023-08-10-at-16.17.31-0b937.jpeg'

const formSchema = z.object({
  garagem: z.string().min(1, 'Campo obrigatório'),
  data: z.string().min(1, 'Campo obrigatório'),
  horario: z.string().min(1, 'Campo obrigatório'),
  ocorrencia: z.enum(['Sim', 'Não'], { required_error: 'Campo obrigatório' }),
  linha: z.string().min(1, 'Campo obrigatório'),
  descricao_danos: z.string().min(1, 'Campo obrigatório'),
  registro_vistoriador: z.string().min(1, 'Campo obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

export default function VistoriaForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chamadoId = searchParams.get('id')

  const [photos, setPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      garagem: '',
      data: new Date().toISOString().split('T')[0],
      horario: new Date().toTimeString().substring(0, 5),
      ocorrencia: 'Não',
      linha: '',
      descricao_danos: '',
      registro_vistoriador: '',
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)

    if (photos.length + newFiles.length > 5) {
      toast.error('Você pode adicionar no máximo 5 fotos.')
      return
    }

    setPhotos((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: FormValues) => {
    if (photos.length === 0) {
      toast.error('Adicione ao menos uma foto do dano.')
      return
    }

    setIsSubmitting(true)

    try {
      const uploadedUrls: string[] = []

      // Upload photos sequentially to ensure stability
      for (const file of photos) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('vistorias')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('vistorias').getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      // Bypass TypeScript checking for newly added columns in migration
      const docData = {
        tipo_documento: 'Vistoria',
        nome_arquivo: `Vistoria - ${values.data} - ${values.horario}`,
        arquivo_url: uploadedUrls[0], // Required field
        fotos_urls: uploadedUrls,
        chamado_id: chamadoId || null,
        registro_responsavel: values.registro_vistoriador,
      } as any

      docData.garagem = values.garagem
      docData.data = values.data
      docData.horario = values.horario
      docData.ocorrencia = values.ocorrencia
      docData.linha = values.linha
      docData.descricao_danos = values.descricao_danos

      const { error: dbError } = await supabase.from('documentos').insert(docData)

      if (dbError) throw dbError

      toast.success('Vistoria registrada com sucesso!')
      navigate('/vistoria/pendentes')
    } catch (error: any) {
      console.error('Erro ao enviar vistoria:', error)
      toast.error(error.message || 'Erro ao registrar vistoria. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex justify-center mb-6">
        <img
          src={logoColorido}
          alt="Via Sudeste"
          className="h-20 w-auto object-contain rounded-xl shadow-sm"
        />
      </div>

      <Card className="border-t-4 border-t-[#225f3d] shadow-md">
        <CardHeader className="text-center pb-8 border-b">
          <CardTitle className="text-3xl font-bold text-slate-800">
            Formulário de Vistoria
          </CardTitle>
          <CardDescription>
            Preencha os detalhes da vistoria e anexe as fotos correspondentes (máx. 5).
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="garagem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garagem</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Garagem Central" {...field} />
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
                        <Input placeholder="Número ou nome da linha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
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
                      <FormLabel>Horário</FormLabel>
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
                  <FormItem className="space-y-3">
                    <FormLabel>Ocorrência Confirmada?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Sim" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Sim</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Não" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Não</FormLabel>
                        </FormItem>
                      </RadioGroup>
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
                    <FormLabel>Descrição dos Danos</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva detalhadamente as avarias encontradas..."
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registro_vistoriador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registro do Vistoriador</FormLabel>
                    <FormControl>
                      <Input placeholder="Matrícula / Registro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <FormLabel className="flex items-center gap-2 text-base">
                    <Camera className="w-5 h-5" />
                    Fotos do Dano <span className="text-red-500">*</span>
                  </FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">
                    Insira até 5 fotos claras das avarias. (Mínimo 1 foto obrigatória)
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {photos.map((file, index) => (
                    <div
                      key={index}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm group"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:text-[#225f3d] hover:border-[#225f3d] hover:bg-[#225f3d]/5 transition-colors"
                    >
                      <ImagePlus className="w-8 h-8 mb-1" />
                      <span className="text-xs font-medium">Adicionar</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-6 rounded-b-xl border-t flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/vistoria/pendentes')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#225f3d] hover:bg-[#1a472d] text-white px-8"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Registrar Vistoria'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
