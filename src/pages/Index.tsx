import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import logoBranco from '@/assets/logo_branco_transparente_nitido-80a6a.png'
import localBgImage from '@/assets/background-bus-a97ed.png'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'

const formSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
})

export default function Index() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      // Small timeout to ensure toaster is mounted
      setTimeout(() => {
        toast({
          title: 'E-mail confirmado!',
          description: 'Faça login para continuar.',
          className: 'bg-green-600 text-white border-none',
        })
      }, 100)
    }
  }, [searchParams, toast])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (signInError) {
      setIsLoading(false)
      setError(signInError.message || 'E-mail ou senha incorretos')
    } else {
      toast({
        title: 'Login realizado com sucesso',
        className: 'bg-green-600 text-white border-none',
      })

      if (data.user) {
        try {
          const { data: profile } = await supabase
            .from('perfil_usuario')
            .select('tipo_usuario')
            .eq('id', data.user.id)
            .single()

          if (profile?.tipo_usuario === 'juridico') {
            navigate('/dashboard/meus-atendimentos', { replace: true })
          }
        } catch (err) {
          console.error('Erro ao buscar perfil para redirecionamento:', err)
        }
      }
      setIsLoading(false)
      // Redirect happens automatically via Layout observation of Auth State for other roles
    }
  }

  return (
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center p-4 bg-[#1a472d] bg-cover bg-center bg-no-repeat transition-all duration-700"
      style={{ backgroundImage: `url('${localBgImage}')` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-0 pointer-events-none" />
      <div className="z-10 w-full max-w-md">
        <Card className="border-white/10 bg-black/30 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl overflow-hidden w-full relative">
          <CardHeader className="space-y-6 pb-6 pt-8">
            <div className="flex justify-center">
              <img
                src={logoBranco}
                alt="Via Sudeste"
                className="w-[180px] h-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="flex justify-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-widest text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ABERTURA DE SINISTRO
              </h1>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="py-2 animate-fade-in-down bg-red-500/20 border-red-500/50 text-white"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">
                  E-mail&nbsp;<span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...form.register('email')}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-[#225f3d] focus-visible:ring-offset-0 focus-visible:border-white transition-colors',
                    form.formState.errors.email
                      ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400'
                      : '',
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">
                  Senha <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register('password')}
                  className={cn(
                    'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-[#225f3d] focus-visible:ring-offset-0 focus-visible:border-white transition-colors',
                    form.formState.errors.password
                      ? 'border-red-400 focus-visible:ring-red-400 focus-visible:border-red-400'
                      : '',
                  )}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-400 animate-fade-in font-medium">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full transition-all active:scale-[0.98] bg-[#225f3d] hover:bg-[#1a472d] text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl mt-4"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center text-sm text-white/90 drop-shadow-sm">
                Não tem uma conta?{' '}
                <Link
                  to="/cadastro"
                  className="font-semibold text-white hover:text-white/80 hover:underline transition-colors"
                >
                  Cadastre-se
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
