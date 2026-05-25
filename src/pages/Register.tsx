import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const formSchema = z
  .object({
    nome_completo: z.string().min(3, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

export default function Register() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome_completo: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    setError(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.nome_completo,
        },
      },
    })

    setIsLoading(false)

    if (signUpError) {
      setError(signUpError.message || 'Erro ao realizar cadastro')
    } else {
      setIsSuccess(true)
      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu e-mail para confirmar a conta.',
        className: 'bg-green-600 text-white border-none',
      })
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-slate-200 shadow-sm animate-fade-in text-center py-6">
        <CardHeader>
          <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4 animate-slide-up">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifique seu e-mail</CardTitle>
          <CardDescription className="text-base mt-2">
            Enviamos um link de confirmação para o seu e-mail. Por favor, acesse-o para confirmar
            seu cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            variant="outline"
            className="mt-4 w-full transition-transform active:scale-[0.98]"
          >
            <Link to="/?confirmed=true">Ir para o Login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm animate-fade-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
        <CardDescription className="text-center">
          Preencha os dados abaixo para se cadastrar
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
            <Label htmlFor="nome_completo">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome_completo"
              placeholder="Seu nome"
              {...form.register('nome_completo')}
              className={
                form.formState.errors.nome_completo
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }
              disabled={isLoading}
            />
            {form.formState.errors.nome_completo && (
              <p className="text-sm text-red-500 animate-fade-in">
                {form.formState.errors.nome_completo.message}
              </p>
            )}
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirmar Senha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register('confirmPassword')}
              className={
                form.formState.errors.confirmPassword
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }
              disabled={isLoading}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500 animate-fade-in">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full transition-transform active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 border-t pt-4">
        <div className="text-sm text-center text-slate-500">
          Já tem conta?{' '}
          <Link to="/" className="text-primary hover:underline font-medium">
            Faça login
          </Link>
        </div>
        <Link
          to="/"
          className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Link>
      </CardFooter>
    </Card>
  )
}
