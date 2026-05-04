import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const formSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
})

export default function Index() {
  const [searchParams] = useSearchParams()
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    setIsLoading(false)

    if (signInError) {
      setError(signInError.message || 'E-mail ou senha incorretos')
    } else {
      toast({
        title: 'Login realizado com sucesso',
        className: 'bg-green-600 text-white border-none',
      })
      // Redirect happens automatically via Layout observation of Auth State
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Entrar no Helpdesk</CardTitle>
        <CardDescription className="text-center">
          Insira seu e-mail e senha para acessar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2 animate-fade-in-down">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">
              E-mail <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...form.register('email')}
              className={
                form.formState.errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
              }
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 animate-fade-in">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Senha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              className={
                form.formState.errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
              }
              disabled={isLoading}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500 animate-fade-in">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full transition-transform active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 border-t pt-4">
        <div className="text-sm text-center text-slate-500">
          Não tem uma conta?{' '}
          <Link to="/cadastro" className="text-primary hover:underline font-medium">
            Cadastre-se
          </Link>
        </div>
        <div className="text-xs text-center text-slate-400 mt-4 px-4 bg-slate-50 p-2 rounded-md border border-slate-100">
          Demo: Use <strong>admin@helpdesk.com</strong> e senha <strong>12345678</strong> ou
          cadastre um novo.
        </div>
      </CardFooter>
    </Card>
  )
}
