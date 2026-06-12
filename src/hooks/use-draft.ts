import { useEffect, useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'

const isValueEmpty = (v: any): boolean => {
  if (v === '' || v === null || v === undefined) return true
  if (v instanceof Date) return false
  if (v instanceof File || v instanceof Blob) return false
  if (Array.isArray(v)) return v.length === 0 || v.every(isValueEmpty)
  if (typeof v === 'object') return Object.values(v).every(isValueEmpty)
  return false
}

export function useDraft<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string,
) {
  const [draftRestored, setDraftRestored] = useState(false)
  const isRestoring = useRef(false)
  const isInitialMount = useRef(true)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        delete parsed.fotos_dano
        delete parsed.assinatura_base64

        const isCompletelyEmpty = Object.values(parsed).every(isValueEmpty)

        if (!isCompletelyEmpty) {
          isRestoring.current = true
          const currentValues = form.getValues()
          const merged = { ...currentValues, ...parsed }

          form.reset(merged)
          setDraftRestored(true)
          setTimeout(() => {
            isRestoring.current = false
          }, 300)
        }
      } catch (e) {
        console.error('Failed to parse draft', e)
      }
    }
  }, [form, storageKey])

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (isInitialMount.current) {
        isInitialMount.current = false
        return
      }

      if (isRestoring.current) return

      const toSave = { ...value }
      delete toSave.fotos_dano
      delete toSave.assinatura_base64

      const isCompletelyEmpty = Object.values(toSave).every(isValueEmpty)

      if (!isCompletelyEmpty) {
        localStorage.setItem(storageKey, JSON.stringify(toSave))
      } else {
        localStorage.removeItem(storageKey)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, storageKey])

  const clearDraft = () => {
    localStorage.removeItem(storageKey)
    setDraftRestored(false)
  }

  return { draftRestored, clearDraft, setDraftRestored }
}
