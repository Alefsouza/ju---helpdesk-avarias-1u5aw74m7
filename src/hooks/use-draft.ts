import { useEffect, useState, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'

export function useDraft<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string,
) {
  const [draftRestored, setDraftRestored] = useState(false)
  const isRestoring = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        delete parsed.fotos_dano
        delete parsed.assinatura_base64

        // Verifica se há pelo menos um valor preenchido
        const isCompletelyEmpty = Object.values(parsed).every(
          (v) =>
            v === '' ||
            v === null ||
            v === undefined ||
            (typeof v === 'object' && v !== null && Object.values(v).every((x) => x === '')),
        )

        if (!isCompletelyEmpty) {
          isRestoring.current = true
          const currentValues = form.getValues()
          const merged = { ...currentValues, ...parsed }

          form.reset(merged)
          setDraftRestored(true)
          setTimeout(() => {
            isRestoring.current = false
          }, 100)
        }
      } catch (e) {
        console.error('Failed to parse draft', e)
      }
    }
  }, [form, storageKey])

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (isRestoring.current) return

      const toSave = { ...value }
      delete toSave.fotos_dano
      delete toSave.assinatura_base64

      const isCompletelyEmpty = Object.values(toSave).every(
        (v) =>
          v === '' ||
          v === null ||
          v === undefined ||
          (typeof v === 'object' && v !== null && Object.values(v).every((x) => x === '')),
      )

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
