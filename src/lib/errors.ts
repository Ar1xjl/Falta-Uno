// Los errores de supabase-js (PostgrestError, AuthError) son objetos planos con `message`,
// no instancias de Error — un `e instanceof Error` a secas los deja pasar como "[object Object]".
export function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return String(e)
}
