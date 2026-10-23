import { useEffect, useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { supabase } from '@/lib/supabase/client'

const isValueEmpty = (v: any): boolean => {
  if (v === '' || v === null || v === undefined) return true
  if (v instanceof Date) return false
  if (v instanceof File || v instanceof Blob) return false
  if (Array.isArray(v)) return v.length === 0 || v.every(isValueEmpty)
  if (typeof v === 'object') return Object.values(v).every(isValueEmpty)
  return false
}

export function getSyncDraft(
  storageKey: string,
  sanitizeDraft?: (raw: Record<string, any>) => Record<string, any> | null,
) {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof sanitizeDraft === 'function') {
          try {
            const sanitized = sanitizeDraft(parsed)
            if (!sanitized) {
              try {
                localStorage.removeItem(storageKey)
              } catch {
                // Ignora erro de storage
              }
              return null
            }
            return sanitized
          } catch (err) {
            console.error('Erro ao sanitizar rascunho síncrono, descartando:', err)
            try {
              localStorage.removeItem(storageKey)
            } catch {
              // Ignora erro de storage
            }
            return null
          }
        }
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to parse draft from localStorage', e)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignora erro de localStorage
    }
  }
  return null
}

export function useDraft<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string,
  userId?: string,
  enabled: boolean = true,
  sanitizeDraft?: (raw: Record<string, any>) => Record<string, any> | null,
) {
  const [draftRestored, setDraftRestored] = useState(false)
  const isRestoring = useRef(true)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) {
      isRestoring.current = false
      return
    }
    const loadDraft = async () => {
      let parsed: any = null

      if (userId) {
        try {
          const { data } = await supabase
            .from('rascunhos_chamado')
            .select('dados')
            .eq('usuario_id', userId)
            .single()

          if (data?.dados && typeof data.dados === 'object') {
            parsed = data.dados
          }
        } catch (e) {
          console.error('Failed to load draft from Supabase', e)
        }
      }

      if (!parsed) {
        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            const temp = JSON.parse(saved)
            if (temp && typeof temp === 'object') {
              parsed = temp
            }
          }
        } catch (e) {
          console.error('Failed to parse draft from localStorage', e)
          try {
            localStorage.removeItem(storageKey)
          } catch {
            // Ignora erro de storage
          }
        }
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        try {
          delete parsed.fotos_dano
          delete parsed.assinatura_base64

          let cleanData = parsed
          if (typeof sanitizeDraft === 'function') {
            try {
              const sanitized = sanitizeDraft(parsed)
              if (!sanitized) {
                // Sanitizer indicou descarte total do rascunho corrompido
                try {
                  localStorage.removeItem(storageKey)
                } catch {
                  // Ignora
                }
                isRestoring.current = false
                return
              }
              cleanData = sanitized
            } catch (err) {
              console.error('Sanitizer falhou ao processar rascunho, descartando rascunho:', err)
              try {
                localStorage.removeItem(storageKey)
              } catch {
                // Ignora
              }
              isRestoring.current = false
              return
            }
          }

          if (cleanData && typeof cleanData === 'object' && !Array.isArray(cleanData)) {
            const isCompletelyEmpty = Object.values(cleanData).every(isValueEmpty)

            if (!isCompletelyEmpty) {
              const currentValues = form.getValues()
              const merged = { ...currentValues, ...cleanData }

              form.reset(merged)
              setDraftRestored(true)
            }
          }
        } catch (err) {
          console.error('Erro ao restaurar rascunho, ignorando rascunho corrompido:', err)
          try {
            localStorage.removeItem(storageKey)
          } catch {
            // Ignora
          }
        }
      }

      setTimeout(() => {
        isRestoring.current = false
      }, 500)
    }

    loadDraft()
  }, [form, storageKey, userId, enabled, sanitizeDraft])

  useEffect(() => {
    if (!enabled) return
    const subscription = form.watch((value) => {
      if (isRestoring.current) return

      const toSave = { ...value }
      delete toSave.fotos_dano
      delete toSave.assinatura_base64

      const isCompletelyEmpty = Object.values(toSave).every(isValueEmpty)

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(async () => {
        if (!isCompletelyEmpty) {
          localStorage.setItem(storageKey, JSON.stringify(toSave))

          if (userId) {
            try {
              await supabase.from('rascunhos_chamado').upsert(
                {
                  usuario_id: userId,
                  dados: toSave as any,
                  atualizado_em: new Date().toISOString(),
                },
                { onConflict: 'usuario_id' },
              )
            } catch (e) {
              console.error('Failed to save draft to Supabase', e)
            }
          }
        } else {
          localStorage.removeItem(storageKey)
          if (userId) {
            try {
              await supabase.from('rascunhos_chamado').delete().eq('usuario_id', userId)
            } catch (e) {
              console.error('Failed to delete draft from Supabase', e)
            }
          }
        }
      }, 1000)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [form, storageKey, userId, enabled])

  const clearDraft = async () => {
    if (!enabled) return
    localStorage.removeItem(storageKey)
    setDraftRestored(false)
    if (userId) {
      try {
        await supabase.from('rascunhos_chamado').delete().eq('usuario_id', userId)
      } catch (e) {
        console.error('Failed to clear draft from Supabase', e)
      }
    }
  }

  return { draftRestored, clearDraft, setDraftRestored }
}
