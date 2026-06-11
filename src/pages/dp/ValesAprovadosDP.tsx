import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function ValesAprovadosDP() {
  const { profile } = useAuth()
  const [parcelas, setParcelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadMonth, setDownloadMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    fetchData()
  }, [downloadMonth])

  const fetchData = async () => {
    if (!downloadMonth) return
    setLoading(true)

    const [year, month] = downloadMonth.split('-')
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    const { data: parcelasData, error } = await supabase
      .from('parcelas_vales')
      .select(`
        id, 
        valor_parcela, 
        data_referencia, 
        chamado_id, 
        chamados (
          id, 
          usuario_id, 
          nome_motorista, 
          registro_motorista, 
          status_aprovacao
        )
      `)
      .gte('data_referencia', startDate)
      .lte('data_referencia', endDate)
      .order('data_referencia', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar parcelas')
      setLoading(false)
      return
    }

    const validParcelas =
      parcelasData?.filter((p: any) => p.chamados?.status_aprovacao === 'aprovado') || []

    const userIds = [
      ...new Set(validParcelas.map((p: any) => p.chamados?.usuario_id).filter(Boolean)),
    ]

    let usersMap = new Map()
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('perfil_usuario')
        .select('id, nome_completo, registro')
        .in('id', userIds)

      usersMap = new Map((usersData || []).map((u) => [u.id, u]))
    }

    const formatted = validParcelas.map((p: any) => {
      const chamado = p.chamados
      const user = chamado?.usuario_id ? usersMap.get(chamado.usuario_id) : null
      return {
        id: p.id,
        chamado_id: p.chamado_id,
        valor_parcela: p.valor_parcela,
        data_referencia: p.data_referencia,
        nome: chamado?.nome_motorista || user?.nome_completo || 'N/A',
        registro: chamado?.registro_motorista || user?.registro || 'N/A',
      }
    })

    setParcelas(formatted)
    setLoading(false)
  }

  const handleDownload = () => {
    if (parcelas.length === 0) {
      return toast.info('Nenhuma parcela válida encontrada para o mês selecionado.')
    }

    const csvRows = ['Registro,Nome Completo,Valor Parcela,Referência']
    parcelas.forEach((p) => {
      const dataRef = format(new Date(p.data_referencia + 'T00:00:00'), 'MM/yyyy')
      csvRows.push(`${p.registro},"${p.nome}",${p.valor_parcela},${dataRef}`)
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vales_${downloadMonth}.csv`
    link.click()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {profile?.tipo_usuario === 'admin' && (
        <div className="mb-4">
          <Button variant="ghost" asChild className="-ml-4 text-slate-500 hover:text-slate-900">
            <Link to="/dashboard/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel Admin
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vales Aprovados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe as parcelas de vales e gere o relatório de descontos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="month"
            value={downloadMonth}
            onChange={(e) => setDownloadMonth(e.target.value)}
            className="w-48 bg-white border-slate-200"
          />
          <Button onClick={handleDownload} className="bg-[#225f3d] hover:bg-[#1a4a2f]">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] pl-6">Chamado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Valor Parcela</TableHead>
                <TableHead className="pr-6">Referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : parcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhuma parcela de vale aprovado encontrada para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                parcelas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium pl-6">
                      #{p.chamado_id.split('-')[0].toUpperCase()}
                    </TableCell>
                    <TableCell>{p.registro}</TableCell>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>R$ {Number(p.valor_parcela).toFixed(2)}</TableCell>
                    <TableCell className="pr-6">
                      {format(new Date(p.data_referencia + 'T00:00:00'), 'MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
