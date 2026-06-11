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
import { Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function ValesAprovadosDP() {
  const [chamados, setChamados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadMonth, setDownloadMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: chamadosData, error: chamadosError } = await supabase
      .from('chamados')
      .select(
        'id, titulo, registro_motorista, nome_motorista, usuario_id, parcelas_vales(id, valor_parcela, data_referencia)',
      )
      .eq('status_aprovacao', 'aprovado')
      .order('criado_em', { ascending: false })

    if (chamadosError) {
      toast.error('Erro ao buscar chamados')
      setLoading(false)
      return
    }

    const { data: usersData } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo, registro')
    const usersMap = new Map((usersData || []).map((u) => [u.id, u]))

    const formatted =
      chamadosData
        ?.map((c) => {
          const user = usersMap.get(c.usuario_id)
          return {
            ...c,
            nome: c.nome_motorista || user?.nome_completo || 'N/A',
            registro: c.registro_motorista || user?.registro || 'N/A',
            total_parcelas: c.parcelas_vales?.length || 0,
            valor_total:
              c.parcelas_vales?.reduce((sum: number, p: any) => sum + Number(p.valor_parcela), 0) ||
              0,
          }
        })
        .filter((c) => c.total_parcelas > 0) || []

    setChamados(formatted)
    setLoading(false)
  }

  const handleDownload = async () => {
    if (!downloadMonth) return toast.error('Selecione um mês')
    const [year, month] = downloadMonth.split('-')
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    const { data: parcelas, error } = await supabase
      .from('parcelas_vales')
      .select('valor_parcela, chamado_id')
      .gte('data_referencia', startDate)
      .lte('data_referencia', endDate)

    if (error) return toast.error('Erro ao buscar parcelas')

    if (!parcelas || parcelas.length === 0) {
      return toast.info('Nenhuma parcela encontrada para o mês selecionado.')
    }

    const chamadoIds = [...new Set(parcelas.map((p) => p.chamado_id))]
    const { data: chamadosRef } = await supabase
      .from('chamados')
      .select('id, usuario_id, nome_motorista, registro_motorista, status_aprovacao')
      .in('id', chamadoIds)
      .eq('status_aprovacao', 'aprovado')

    const validChamadosIds = new Set(chamadosRef?.map((c) => c.id) || [])
    const validParcelas = parcelas.filter((p) => validChamadosIds.has(p.chamado_id))

    if (validParcelas.length === 0) {
      return toast.info('Nenhuma parcela válida encontrada para o mês selecionado.')
    }

    const { data: usersRef } = await supabase
      .from('perfil_usuario')
      .select('id, nome_completo, registro')
    const usersMap = new Map((usersRef || []).map((u) => [u.id, u]))
    const chamadosMap = new Map((chamadosRef || []).map((c) => [c.id, c]))

    const csvRows = ['RE,Nome,Valor Parcela']
    validParcelas.forEach((p) => {
      const chamado = chamadosMap.get(p.chamado_id)
      const user = chamado ? usersMap.get(chamado.usuario_id) : null
      const nome = chamado?.nome_motorista || user?.nome_completo || 'N/A'
      const re = chamado?.registro_motorista || user?.registro || 'N/A'
      csvRows.push(`${re},"${nome}",${p.valor_parcela}`)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico de Vales Aprovados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe os vales e gere o relatório de descontos para a folha.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <Input
            type="month"
            value={downloadMonth}
            onChange={(e) => setDownloadMonth(e.target.value)}
            className="w-40 border-none shadow-none focus-visible:ring-0"
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
                <TableHead>Funcionário</TableHead>
                <TableHead>RE</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead className="pr-6">Parcelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : chamados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum vale aprovado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                chamados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium pl-6">
                      #{c.id.split('-')[0].toUpperCase()}
                    </TableCell>
                    <TableCell>{c.nome}</TableCell>
                    <TableCell>{c.registro}</TableCell>
                    <TableCell>R$ {c.valor_total.toFixed(2)}</TableCell>
                    <TableCell className="pr-6">{c.total_parcelas}x</TableCell>
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
