import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

// Entrada por SSO vindo do Cérebro: /sso?sso=TICKET
// A Edge Function sso-cerebro valida o ticket e devolve uma sessão Supabase
// real (magic link de uso único trocado por access/refresh token).
export default function Sso() {
  const navigate = useNavigate()
  const [erro, setErro] = useState('')

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get('sso') || ''
    if (!ticket) {
      setErro('Ticket SSO ausente no link.')
      return
    }
    const base = import.meta.env.VITE_SUPABASE_URL as string
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
    fetch(base + '/functions/v1/sso-cerebro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key },
      body: JSON.stringify({ ticket }),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => null)
        if (!r.ok || !j?.session?.access_token) {
          throw new Error(j?.error || 'Ticket recusado.')
        }
        const { error } = await supabase.auth.setSession({
          access_token: j.session.access_token,
          refresh_token: j.session.refresh_token,
        })
        if (error) throw new Error('Falha ao instalar a sessão.')
        navigate('/dashboard', { replace: true })
      })
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Falha no SSO. Tente pelo Cérebro de novo.'),
      )
  }, [navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b1f14',
        color: '#eafff4',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
        {erro ? (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>SSO não concluído</h1>
            <p style={{ color: '#a9d9c2', fontSize: 14 }}>{erro}</p>
            <a
              href="/"
              style={{ color: '#7dd3fc', fontSize: 14, display: 'inline-block', marginTop: 16 }}
            >
              Ir para o início
            </a>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, marginBottom: 12 }}>Conectando via Cérebro…</h1>
            <p style={{ color: '#a9d9c2', fontSize: 14 }}>Validando seu acesso ao HelpDesk.</p>
          </>
        )}
      </div>
    </div>
  )
}
