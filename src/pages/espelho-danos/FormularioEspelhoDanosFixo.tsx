import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Calendar, Clock } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

function FormGroup({
  label,
  error,
  required = true,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
}

export default function FormularioEspelhoDanosFixo() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [data, setData] = useState({
    numeroOs: '',
    garagem: '',
    data: '',
    horario: '',
    ocorrencia: '',
    linha: '',
    descricaoDanos: '',
    registroVistoriador: '',
    nomeVistoriador: '',
    registroMotorista: '',
    nomeMotorista: '',
  })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!data.numeroOs) errs.numeroOs = 'Campo obrigatório'
    if (!data.garagem) errs.garagem = 'Selecione uma garagem'
    if (!data.data) errs.data = 'Campo obrigatório'
    if (!data.horario) errs.horario = 'Campo obrigatório'
    if (!data.ocorrencia) errs.ocorrencia = 'Selecione sim ou não'
    if (!data.linha) errs.linha = 'Campo obrigatório'
    if (!data.descricaoDanos) errs.descricaoDanos = 'Campo obrigatório'
    if (!data.registroVistoriador) errs.registroVistoriador = 'Campo obrigatório'
    if (!data.nomeVistoriador) errs.nomeVistoriador = 'Campo obrigatório'
    if (!data.registroMotorista) errs.registroMotorista = 'Campo obrigatório'
    if (!data.nomeMotorista) errs.nomeMotorista = 'Campo obrigatório'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const generatePDFDoc = async (values: typeof data) => {
    let logoBase64: string | null = null
    try {
      const res = await fetch(
        'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/documentos/logo-via-sudeste.png',
      )
      if (res.ok) {
        const resBlob = await res.blob()
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
          reader.readAsDataURL(resBlob)
        })
      }
    } catch (err) {
      console.error('Erro ao carregar logo:', err)
    }

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

      currentY = currentLineY - 4.2 + 8
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

    renderField('Número de OS', values.numeroOs)
    renderField('Garagem', values.garagem)
    renderField('Data', dataFormatada)
    renderField('Horário', values.horario)
    renderField('Ocorrência', values.ocorrencia)
    renderField('Linha', values.linha)
    renderField('Descrição dos Danos', values.descricaoDanos)
    renderField('Registro do Vistoriador', values.registroVistoriador)
    renderField('Nome do Vistoriador', values.nomeVistoriador)
    renderField('Registro do Motorista', values.registroMotorista)
    renderField('Nome do Motorista', values.nomeMotorista)

    for (let i = 1; i <= pageNumber; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text(`Página ${i} de ${pageNumber}`, pageWidth - 25, pageHeight - 25 + 5, {
        align: 'right',
      })
    }

    return doc
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      let pdfBlob: Blob
      try {
        const doc = await generatePDFDoc(data)
        pdfBlob = doc.output('blob')
      } catch (err) {
        console.error(err)
        throw new Error('Erro ao gerar documento. Tente novamente')
      }

      const fileName = `ESPELHO_DE_DANOS_${Date.now()}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('documentos').insert({
        tipo_documento: 'Espelho de Danos',
        nome_arquivo: fileName,
        arquivo_url: urlData.publicUrl,
        registro_responsavel: data.registroVistoriador,
        nome_responsavel: data.nomeVistoriador,
        cargo_responsavel: 'Vistoriador',
        chamado_id: null,
      })
      if (dbError) throw dbError

      toast({ title: 'Sucesso', description: 'Formulário enviado com sucesso' })
      navigate('/espelho-danos-fixo/sucesso', { state: { fileName, tipo: 'Espelho de Danos' } })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao enviar formulário. Tente novamente',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData((p) => ({ ...p, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: '' }))
  }

  const handleSelect = (name: string, value: string) => {
    setData((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* App Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/documentos/logo-via-sudeste.png"
              alt="Via Sudeste"
              className="h-8 object-contain"
            />
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Espelho de Danos</h1>
              <p className="text-xs text-slate-500">Registro de Avarias</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Espelho de Danos</h2>
              <p className="text-slate-500 mt-1 text-sm">
                Preencha os dados abaixo para registrar as avarias.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Número de OS" error={errors.numeroOs}>
                  <Input
                    name="numeroOs"
                    placeholder="Informe o número"
                    value={data.numeroOs}
                    onChange={handleChange}
                  />
                </FormGroup>

                <FormGroup label="Garagem" error={errors.garagem}>
                  <Select value={data.garagem} onValueChange={(v) => handleSelect('garagem', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cursino">Cursino</SelectItem>
                      <SelectItem value="Sapopemba">Sapopemba</SelectItem>
                    </SelectContent>
                  </Select>
                </FormGroup>

                <FormGroup label="Data" error={errors.data}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                      name="data"
                      type="date"
                      className="pl-10"
                      value={data.data}
                      onChange={handleChange}
                    />
                  </div>
                </FormGroup>

                <FormGroup label="Horário" error={errors.horario}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                      name="horario"
                      type="time"
                      className="pl-10"
                      value={data.horario}
                      onChange={handleChange}
                    />
                  </div>
                </FormGroup>

                <FormGroup label="Ocorrência" error={errors.ocorrencia}>
                  <RadioGroup
                    value={data.ocorrencia}
                    onValueChange={(v) => handleSelect('ocorrencia', v)}
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Sim" id="oc-sim" />
                      <Label htmlFor="oc-sim" className="cursor-pointer text-slate-700">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Não" id="oc-nao" />
                      <Label htmlFor="oc-nao" className="cursor-pointer text-slate-700">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </FormGroup>

                <FormGroup label="Linha" error={errors.linha}>
                  <Input
                    name="linha"
                    placeholder="Informe a linha"
                    value={data.linha}
                    onChange={handleChange}
                  />
                </FormGroup>
              </div>

              <FormGroup label="Descrição dos Danos" error={errors.descricaoDanos}>
                <Textarea
                  name="descricaoDanos"
                  placeholder="Descreva os danos encontrados"
                  className="min-h-[120px] resize-y"
                  value={data.descricaoDanos}
                  onChange={handleChange}
                />
              </FormGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Registro do Vistoriador" error={errors.registroVistoriador}>
                  <Input
                    name="registroVistoriador"
                    placeholder="Informe o registro"
                    value={data.registroVistoriador}
                    onChange={handleChange}
                  />
                </FormGroup>

                <FormGroup label="Nome do Vistoriador" error={errors.nomeVistoriador}>
                  <Input
                    name="nomeVistoriador"
                    placeholder="Informe o nome"
                    value={data.nomeVistoriador}
                    onChange={handleChange}
                  />
                </FormGroup>

                <FormGroup label="Registro do Motorista" error={errors.registroMotorista}>
                  <Input
                    name="registroMotorista"
                    placeholder="Informe o registro"
                    value={data.registroMotorista}
                    onChange={handleChange}
                  />
                </FormGroup>

                <FormGroup label="Nome do Motorista" error={errors.nomeMotorista}>
                  <Input
                    name="nomeMotorista"
                    placeholder="Informe o nome"
                    value={data.nomeMotorista}
                    onChange={handleChange}
                  />
                </FormGroup>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#2D6246] hover:bg-[#2D6246]/90 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar formulário'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
