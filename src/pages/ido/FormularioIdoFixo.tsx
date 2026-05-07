import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, FileSignature } from 'lucide-react'

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
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>IDO - ${formData.protocolo}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { display: flex; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { width: 50px; height: 50px; background: #2563eb; border-radius: 8px; margin-right: 20px; }
            h1 { margin: 0; color: #1e40af; font-size: 24px; }
            .section { margin-bottom: 24px; padding: 20px; background: #f8fafc; border-radius: 8px; }
            h3 { margin-top: 0; color: #0f172a; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .field { margin-bottom: 12px; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
            .value { font-size: 16px; font-weight: 500; color: #0f172a; }
            .signature-container { margin-top: 40px; text-align: center; page-break-inside: avoid; }
            .signature-img { max-width: 300px; height: auto; border-bottom: 1px solid #000; margin-bottom: 8px; }
            .signature-name { font-weight: bold; font-size: 16px; }
            .signature-role { color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo"></div>
            <h1>Boletim IDO - Protocolo: ${formData.protocolo}</h1>
          </div>
          
          <div class="section">
            <h3>Dados do Colaborador</h3>
            <div class="grid">
              <div class="field"><div class="label">Nome Completo</div><div class="value">${formData.nome_colaborador}</div></div>
              <div class="field"><div class="label">Registro</div><div class="value">${formData.registro_colaborador}</div></div>
            </div>
          </div>

          <div class="section">
            <h3>Testemunha 1</h3>
            <div class="grid">
              <div class="field"><div class="label">Nome</div><div class="value">${formData.t1_nome}</div></div>
              <div class="field"><div class="label">Telefone</div><div class="value">${formData.t1_telefone}</div></div>
              <div class="field"><div class="label">Endereço</div><div class="value">${formData.t1_endereco}</div></div>
              <div class="field"><div class="label">SG</div><div class="value">${formData.t1_sg}</div></div>
            </div>
          </div>

          <div class="section">
            <h3>Testemunha 2</h3>
            <div class="grid">
              <div class="field"><div class="label">Nome</div><div class="value">${formData.t2_nome}</div></div>
              <div class="field"><div class="label">Telefone</div><div class="value">${formData.t2_telefone}</div></div>
              <div class="field"><div class="label">Endereço</div><div class="value">${formData.t2_endereco}</div></div>
              <div class="field"><div class="label">SG</div><div class="value">${formData.t2_sg}</div></div>
            </div>
          </div>

          <div class="section">
            <h3>Testemunha 3</h3>
            <div class="grid">
              <div class="field"><div class="label">Nome</div><div class="value">${formData.t3_nome}</div></div>
              <div class="field"><div class="label">Telefone</div><div class="value">${formData.t3_telefone}</div></div>
              <div class="field"><div class="label">Endereço</div><div class="value">${formData.t3_endereco}</div></div>
              <div class="field"><div class="label">SG</div><div class="value">${formData.t3_sg}</div></div>
            </div>
          </div>

          <div class="signature-container">
            <img class="signature-img" src="${formData.assinatura}" alt="Assinatura" />
            <div class="signature-name">${formData.nome_colaborador}</div>
            <div class="signature-role">Colaborador (Registro: ${formData.registro_colaborador})</div>
          </div>
        </body>
        </html>
      `

      const blob = new Blob([html], { type: 'application/pdf' })
      const fileName = `DADOS_DO_BOLETIM_ELETRONICO_${Date.now()}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, blob, { contentType: 'application/pdf' })

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
