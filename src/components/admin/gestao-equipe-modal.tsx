import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { createAdminUser } from '@/services/manage-users'

export function GestaoEquipeModal({ open, setOpen, user, onSuccess }: any) {
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    tipo_usuario: 'responsavel',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        nome_completo: user.nome_completo,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
      })
    } else {
      setFormData({ nome_completo: '', email: '', tipo_usuario: 'responsavel' })
    }
  }, [user, open])

  const handleSave = async () => {
    if (!formData.nome_completo || !formData.email) return toast.error('Preencha todos os campos')
    setIsSaving(true)
    try {
      if (user) {
        const { error } = await supabase
          .from('perfil_usuario')
          .update({
            nome_completo: formData.nome_completo,
            tipo_usuario: formData.tipo_usuario,
          })
          .eq('id', user.id)
        if (error) throw error
        toast.success('Usuário atualizado com sucesso')
      } else {
        const { data, error } = await createAdminUser(formData)
        if (error || data?.error) throw error || new Error(data?.error)
        toast.success('Usuário criado com sucesso')
      }
      onSuccess()
      setOpen(false)
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        toast.error('Este e-mail já está em uso')
      } else {
        toast.error('Erro ao salvar usuário')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Editar' : 'Novo'} Responsável</DialogTitle>
          <DialogDescription>
            {user
              ? 'Atualize as informações do usuário.'
              : 'Cadastre um novo responsável ou admin. A senha inicial será HelpdeskUser@123'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              placeholder="João da Silva"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@empresa.com"
              type="email"
              disabled={!!user}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Acesso</Label>
            <Select
              value={formData.tipo_usuario}
              onValueChange={(v) => setFormData({ ...formData, tipo_usuario: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="responsavel">Responsável (Atendimento)</SelectItem>
                <SelectItem value="admin">Administrador (Total)</SelectItem>
                <SelectItem value="vistoriador">Vistoriador (Apenas Vistorias)</SelectItem>
                <SelectItem value="coc">COC (Abertura de Chamadas)</SelectItem>
                <SelectItem value="sos">SOS (Chamadas Pendentes)</SelectItem>
                <SelectItem value="juridico">Jurídico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
