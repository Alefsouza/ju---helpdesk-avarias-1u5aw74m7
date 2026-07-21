export const MARIA_JURIDICO_EMAIL = 'maria.rodrigues@viasudeste.com'

export const isMariaJuridico = (email?: string | null): boolean =>
  !!email && email.toLowerCase() === MARIA_JURIDICO_EMAIL
