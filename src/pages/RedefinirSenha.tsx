import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const loginBgImage =
  'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/assets/6.jpeg'
const logoBranco =
  'https://wrnhfpncasqifaisvyaf.supabase.co/storage/v1/object/public/assets/logo_branco_transparente_nitido-80a6a-BIUCr1YD.png'

const INSTITUTIONAL_GREEN_LIGHT = '#4ca371'

const resetSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isBgLoaded, setIsBgLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.src = loginBgImage
    if (img.complete) {
      setIsBgLoaded(true)
    } else {
      img.onload = () => setIsBgLoaded(true)
      img.onerror = () => setIsBgLoaded(false)
    }
  }, [])

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    let isMounted = true

    const parseParams = () => {
      // Supabase pode enviar tokens tanto na query string (?code=... ou ?token_hash=...)
      // quanto no fragmento hash (#access_token=... ou #error=...)
      const searchParams = new URLSearchParams(window.location.search)
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash
      const hashParams = new URLSearchParams(hash)

      return {
        code: searchParams.get('code'),
        tokenHash: searchParams.get('token_hash'),
        type: (searchParams.get('type') || hashParams.get('type')) as any,
        accessToken: hashParams.get('access_token'),
        refreshToken: hashParams.get('refresh_token'),
        errorCode: searchParams.get('error_code') || hashParams.get('error_code'),
        errorDescription:
          searchParams.get('error_description') || hashParams.get('error_description'),
      }
    }

    const initRecovery = async () => {
      try {
        const { code, tokenHash, type, accessToken, refreshToken, errorCode, errorDescription } =
          parseParams()

        if (errorCode || errorDescription) {
          if (!isMounted) return
          setInitError(
            errorDescription
              ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
              : 'O link de recuperação expirou ou é inválido. Por favor, solicite um novo link.',
          )
          setIsLoadingSession(false)
          return
        }

        // Se veio code na query (PKCE flow)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Erro ao trocar code por sessão:', error)
            if (!isMounted) return
            setInitError('O link de recuperação expirou ou é inválido. Solicite um novo link.')
            setIsLoadingSession(false)
            return
          }
          if (!isMounted) return
          setSessionReady(true)
          setIsLoadingSession(false)
          return
        }

        // Se veio token_hash (verifyOtp)
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as any) || 'recovery',
          })
          if (error) {
            console.error('Erro ao verificar token_hash:', error)
            if (!isMounted) return
            setInitError('O link de recuperação expirou ou é inválido. Solicite um novo link.')
            setIsLoadingSession(false)
            return
          }
          if (!isMounted) return
          setSessionReady(true)
          setIsLoadingSession(false)
          return
        }

        // Se veio hash com access_token & refresh_token
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            console.error('Erro ao configurar sessão via token:', error)
            if (!isMounted) return
            setInitError('O link de recuperação expirou ou é inválido. Solicite um novo link.')
            setIsLoadingSession(false)
            return
          }
          if (!isMounted) return
          setSessionReady(true)
          setIsLoadingSession(false)
          return
        }

        // Caso a sessão já tenha sido detectada automaticamente pelo cliente Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          if (!isMounted) return
          setSessionReady(true)
          setIsLoadingSession(false)
          return
        }

        // Se não houver nada, dar um breve timeout para o onAuthStateChange
        const timeout = setTimeout(async () => {
          if (!isMounted) return
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession()
          if (retrySession) {
            setSessionReady(true)
          } else {
            setInitError(
              'Nenhuma sessão de recuperação ativa encontrada. Acesse o link enviado por e-mail ou solicite novamente.',
            )
          }
          setIsLoadingSession(false)
        }, 1500)

        return () => clearTimeout(timeout)
      } catch (err: any) {
        console.error('Erro na inicialização da redefinição:', err)
        if (!isMounted) return
        setInitError('Não foi possível validar o link de recuperação. Tente novamente.')
        setIsLoadingSession(false)
      }
    }

    initRecovery()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true)
        setIsLoadingSession(false)
        setInitError(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (values: ResetFormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })

      if (error) {
        console.error('Erro ao atualizar senha:', error)
        setSubmitError(error.message || 'Não foi possível alterar sua senha. Tente novamente.')
      } else {
        setIsSuccess(true)
        toast({
          title: 'Senha redefinida com sucesso!',
          description: 'Você já pode acessar sua conta com a nova senha.',
          className: 'bg-green-600 text-white border-none',
        })
      }
    } catch (err: any) {
      console.error('Erro inesperado ao salvar nova senha:', err)
      setSubmitError('Ocorreu um erro ao redefinir a senha. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-4 bg-[#1a472d] bg-cover bg-center bg-no-repeat transition-all duration-700 overflow-y-auto"
      style={isBgLoaded ? { backgroundImage: `url('${loginBgImage}')` } : undefined}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-0 pointer-events-none transition-opacity duration-700',
          isBgLoaded ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="z-10 w-full max-w-md flex flex-col items-center gap-6 animate-fade-in-up py-8">
        {/* Logo Container */}
        <div
          className={cn(
            'w-full max-w-[320px] rounded-2xl border border-white/20 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl px-8 py-6 transition-colors duration-700',
            isBgLoaded ? 'bg-white/10' : 'bg-[#1a472d]',
          )}
        >
          <img
            src={logoBranco}
            alt="Via Sudeste"
            className="w-full h-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Card de Redefinição */}
        <Card
          className={cn(
            'border-white/20 backdrop-blur-md sm:backdrop-blur-lg shadow-2xl overflow-hidden w-full relative transition-colors duration-700 rounded-2xl',
            isBgLoaded ? 'bg-white/10' : 'bg-[#1a472d]',
          )}
        >
          <CardContent className="pb-8 pt-8 px-6">
            <div className="flex flex-col items-center gap-2 mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-widest text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                REDEFINIR SENHA
              </h1>
              <p className="text-sm font-normal text-white/80 text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {isSuccess ? 'Senha atualizada' : 'Crie uma nova senha para acessar sua conta'}
              </p>
            </div>

            {isLoadingSession ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#4ca371]" />
                <p className="text-sm text-white/80">Validando link de recuperação...</p>
              </div>
            ) : isSuccess ? (
              <div className="space-y-6 animate-fade-in text-center py-2">
                <div className="mx-auto bg-green-500/20 p-4 rounded-full w-fit border border-green-500/30">
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-white">Senha alterada com sucesso!</h2>
                  <p className="text-sm text-white/80">
                    Sua nova senha já está valendo. Clique abaixo para fazer login no sistema.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full transition-all active:scale-[0.98] bg-[#225f3d] hover:bg-[#1a472d] text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl rounded-lg border border-[#4ca371]/30"
                >
                  Ir para o Login
                </Button>
              </div>
            ) : initError ? (
              <div className="space-y-5 animate-fade-in">
                <Alert
                  variant="destructive"
                  className="py-3 bg-red-500/20 border-red-500/50 text-white backdrop-blur-sm"
                >
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="ml-2 text-sm leading-relaxed">
                    {initError}
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    asChild
                    className="w-full bg-[#225f3d] hover:bg-[#1a472d] text-white h-11 font-semibold rounded-lg border border-[#4ca371]/30"
                  >
                    <Link to="/">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Solicitar novo link no Login
                    </Link>
                  </Button>
                  <Link
                    to="/"
                    className="text-center text-sm text-white/70 hover:text-white flex items-center justify-center transition-colors pt-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {submitError && (
                  <Alert
                    variant="destructive"
                    className="py-2 animate-fade-in-down bg-red-500/20 border-red-500/50 text-white backdrop-blur-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2 text-xs">{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Nova Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                    Nova Senha <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10"
                      style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                    />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      {...form.register('password')}
                      className={cn(
                        'pl-11 pr-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg h-12 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#225f3d]/60 focus-visible:ring-offset-0 focus-visible:border-[#4ca371] hover:bg-white/15',
                        form.formState.errors.password
                          ? 'border-red-400 focus-visible:ring-red-400/60 focus-visible:border-red-400'
                          : '',
                      )}
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none"
                      style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-400 animate-fade-in font-medium">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirmar Nova Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/90 text-sm font-medium">
                    Confirmar Nova Senha <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors z-10"
                      style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                    />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      {...form.register('confirmPassword')}
                      className={cn(
                        'pl-11 pr-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg h-12 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#225f3d]/60 focus-visible:ring-offset-0 focus-visible:border-[#4ca371] hover:bg-white/15',
                        form.formState.errors.confirmPassword
                          ? 'border-red-400 focus-visible:ring-red-400/60 focus-visible:border-red-400'
                          : '',
                      )}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none"
                      style={{ color: INSTITUTIONAL_GREEN_LIGHT }}
                      aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-400 animate-fade-in font-medium">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full transition-all active:scale-[0.98] bg-[#225f3d] hover:bg-[#1a472d] text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl mt-4 rounded-lg border border-[#4ca371]/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isSubmitting ? 'Salvando nova senha...' : 'Salvar nova senha'}
                </Button>

                <div className="text-center text-sm text-white/90 drop-shadow-sm pt-2">
                  <Link
                    to="/"
                    className="text-white/80 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Cancelar e voltar ao Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
