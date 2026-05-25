import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { FileUp, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function ImportarFrota() {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim())
      if (lines.length < 2) {
        throw new Error('O arquivo está vazio ou não possui dados suficientes.')
      }

      const separator = lines[0].includes(';') ? ';' : ','
      const headers = lines[0]
        .split(separator)
        .map((h) => h.trim().toLowerCase().replace(/["']/g, ''))

      const prefixoIdx = headers.findIndex((h) => h.includes('prefixo') || h.includes('carro'))
      const placaIdx = headers.findIndex((h) => h.includes('placa'))
      const garagemIdx = headers.findIndex((h) => h.includes('garagem'))

      if (prefixoIdx === -1 || garagemIdx === -1) {
        throw new Error('O arquivo precisa ter as colunas "Prefixo" e "Garagem".')
      }

      const veiculos = []
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(separator).map((cell) => cell.trim().replace(/^["']|["']$/g, ''))
        const prefixo = row[prefixoIdx]
        if (prefixo) {
          veiculos.push({
            prefixo: prefixo,
            placa: placaIdx !== -1 ? row[placaIdx] : null,
            garagem: row[garagemIdx] || 'Desconhecida',
          })
        }
      }

      // Upsert in batches of 500
      for (let i = 0; i < veiculos.length; i += 500) {
        const chunk = veiculos.slice(i, i + 500)
        const { error } = await supabase
          .from('frota_veiculos' as any)
          .upsert(chunk, { onConflict: 'prefixo' })
        if (error) throw error
      }

      toast.success(`Upload concluído! ${veiculos.length} veículos processados.`)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao processar arquivo. Verifique o formato.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle>Importar Frota</CardTitle>
        <CardDescription>
          Faça o upload de um arquivo CSV contendo os dados da frota de veículos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">Instruções para o arquivo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                O arquivo deve ser formato <strong>.csv</strong> (separado por vírgulas ou ponto e
                vírgula). Se usar Excel, clique em "Salvar Como" e escolha "CSV (separado por
                vírgulas)".
              </li>
              <li>A primeira linha deve conter os cabeçalhos das colunas.</li>
              <li>
                Colunas obrigatórias: <strong>Prefixo</strong> (ou Carro) e <strong>Garagem</strong>
                .
              </li>
              <li>
                Coluna opcional: <strong>Placa</strong>.
              </li>
              <li>Veículos já existentes serão atualizados automaticamente com os novos dados.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center w-full">
          <label
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 transition-colors relative ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 mb-3 text-blue-600 animate-spin" />
                  <p className="mb-2 text-sm text-slate-500 font-medium">Processando arquivo...</p>
                </>
              ) : (
                <>
                  <FileUp className="w-10 h-10 mb-3 text-slate-400 group-hover:text-blue-500" />
                  <p className="mb-2 text-sm text-slate-600">
                    <span className="font-semibold text-blue-600">Clique para fazer upload</span> ou
                    arraste o arquivo CSV
                  </p>
                  <p className="text-xs text-slate-500">Tamanho máximo: 10MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
