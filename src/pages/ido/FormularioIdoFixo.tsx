import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, FileSignature } from 'lucide-react'
import { jsPDF } from 'jspdf'

function SignaturePad({ onChange, error }: { onChange: (val: string) => void; error?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`border rounded-md bg-white ${error ? 'border-destructive' : 'border-input'}`}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full h-[200px] touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Limpar Assinatura
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">Assinatura é obrigatória</span>}
    </div>
  )
}

export default function FormularioIdoFixo() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    protocolo: '',
    nome_colaborador: '',
    registro_colaborador: '',
    t1_nome: '',
    t1_endereco: '',
    t1_sg: '',
    t1_telefone: '',
    t2_nome: '',
    t2_endereco: '',
    t2_sg: '',
    t2_telefone: '',
    t3_nome: '',
    t3_endereco: '',
    t3_sg: '',
    t3_telefone: '',
    assinatura: '',
  })
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, boolean> = {}
    let isValid = true
    Object.keys(formData).forEach((k) => {
      if (!formData[k as keyof typeof formData]) {
        newErrors[k] = true
        isValid = false
      }
    })
    setErrors(newErrors)
    return isValid
  }

  const generatePDFDoc = async (data: typeof formData) => {
    const doc = new jsPDF()

    let logoBase64 = null
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.src =
        'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/documentos/logo-via-sudeste.png'
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

    drawField('Protocolo do BO/TOKEN:', data.protocolo)
    drawField('Nome do colaborador:', data.nome_colaborador)
    drawField('Registro do colaborador:', data.registro_colaborador)

    const drawTestemunha = (num: number, t: any) => {
      if (t && t.nome) {
        drawField(`Testemunha ${num} - Nome:`, t.nome)
        drawField(`Testemunha ${num} - Endereço:`, t.endereco)
        drawField(`Testemunha ${num} - SG:`, t.sg)
        drawField(`Testemunha ${num} - Telefone:`, t.telefone)
      }
    }

    drawTestemunha(1, {
      nome: data.t1_nome,
      endereco: data.t1_endereco,
      sg: data.t1_sg,
      telefone: data.t1_telefone,
    })
    drawTestemunha(2, {
      nome: data.t2_nome,
      endereco: data.t2_endereco,
      sg: data.t2_sg,
      telefone: data.t2_telefone,
    })
    drawTestemunha(3, {
      nome: data.t3_nome,
      endereco: data.t3_endereco,
      sg: data.t3_sg,
      telefone: data.t3_telefone,
    })

    if (data.assinatura) {
      checkPageBreak(30 + 8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(43, 43, 43)
      doc.text('Assinatura Digital:', margin, y)
      y += 6
      try {
        doc.addImage(data.assinatura, 'PNG', margin, y, 50, 30)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast({
        title: 'Erro de validação',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let pdfBlob: Blob
      try {
        const doc = await generatePDFDoc(formData)
        pdfBlob = doc.output('blob')
      } catch (err) {
        console.error(err)
        throw new Error('Erro ao gerar documento. Tente novamente')
      }

      const fileName = `DADOS_DO_BOLETIM_ELETRONICO_${Date.now()}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('documentos').insert({
        tipo_documento: 'IDO',
        nome_arquivo: fileName,
        arquivo_url: urlData.publicUrl,
        registro_responsavel: formData.registro_colaborador,
        nome_responsavel: formData.nome_colaborador,
        cargo_responsavel: 'Colaborador',
        chamado_id: null,
      })

      if (dbError) throw dbError

      toast({ title: 'Sucesso', description: 'Formulário enviado com sucesso.' })
      navigate('/ido-fixo/sucesso', { state: { fileName, tipo: 'IDO' } })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Erro ao enviar formulário. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderInput = (label: string, field: string, placeholder: string) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        placeholder={placeholder}
        value={formData[field as keyof typeof formData]}
        onChange={(e) => handleChange(field, e.target.value)}
        className={errors[field] ? 'border-destructive' : ''}
      />
      {errors[field] && <span className="text-xs text-destructive">Campo obrigatório</span>}
    </div>
  )

  return (
    <div className="min-h-screen bg-muted py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-sm">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Boletim IDO</h1>
            <p className="text-muted-foreground">Preencha os dados da ocorrência</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Principais</CardTitle>
              <CardDescription>Informações básicas do boletim e do colaborador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderInput('Protocolo IDO', 'protocolo', 'Informe o protocolo')}
              {renderInput('Nome do colaborador', 'nome_colaborador', 'Informe o nome')}
              {renderInput('Registro do colaborador', 'registro_colaborador', 'Informe o registro')}
            </CardContent>
          </Card>

          {[1, 2, 3].map((num) => (
            <Card key={num}>
              <CardHeader>
                <CardTitle>Testemunha {num}</CardTitle>
                <CardDescription>Dados da testemunha {num}.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInput('Nome', `t${num}_nome`, 'Nome da testemunha')}
                {renderInput('Telefone', `t${num}_telefone`, 'Telefone')}
                <div className="sm:col-span-2">
                  {renderInput('Endereço', `t${num}_endereco`, 'Endereço completo')}
                </div>
                {renderInput('SG', `t${num}_sg`, 'SG da testemunha')}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Assinatura</CardTitle>
              <CardDescription>Assine no quadro abaixo para validar o documento.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad
                error={errors.assinatura}
                onChange={(val) => handleChange('assinatura', val)}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Formulário'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
